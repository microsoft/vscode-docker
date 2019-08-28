/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, ProviderResult, ShellExecution, ShellQuotedString, Task, TaskDefinition, TaskProvider, WorkspaceFolder } from 'vscode';
import { callWithTelemetryAndErrorHandling } from 'vscode-azureextensionui';
import { DockerPlatform, getPlatform } from '../debugging/DockerPlatformHelper';
import { cloneObject } from '../utils/cloneObject';
import { CommandLineBuilder } from '../utils/commandLineBuilder';
import { Platform, PlatformOS } from '../utils/platform';
import { DockerBuildTaskDefinition } from './DockerBuildTaskProvider';
import { NetCoreTaskHelper, NetCoreTaskOptions } from './netcore/NetCoreTaskHelper';
import { NodeTaskHelper, NodeTaskRunOptions } from './node/NodeTaskHelper';
import { addTask, getAssociatedDockerBuildTask } from './TaskHelper';

export interface DockerContainerExtraHost {
    hostname: string;
    ip: string;
}

export interface DockerContainerPort {
    hostPort?: number;
    containerPort: number;
    protocol?: 'tcp' | 'udp';
}

export interface DockerContainerVolume {
    localPath: string;
    containerPath: string;
    permissions?: 'ro' | 'rw';
}

export interface DockerRunOptions {
    command?: string | ShellQuotedString[];
    containerName?: string;
    entrypoint?: string;
    env?: { [key: string]: string };
    envFiles?: string[];
    extraHosts?: DockerContainerExtraHost[];
    image?: string;
    labels?: { [key: string]: string };
    network?: string;
    networkAlias?: string;
    os?: PlatformOS;
    ports?: DockerContainerPort[];
    portsPublishAll?: boolean;
    volumes?: DockerContainerVolume[];
}

export interface DockerRunTaskDefinition extends TaskDefinition {
    label?: string;
    dependsOn?: string[];
    dockerRun?: DockerRunOptions;
    netCore?: NetCoreTaskOptions;
    node?: NodeTaskRunOptions;
    platform?: DockerPlatform;
}

export interface DockerRunTask extends Task {
    definition: DockerRunTaskDefinition;
}

// tslint:disable-next-line: no-empty-interface
export interface DockerRunHelperOptions {
}

export interface DockerRunTaskContext {
    helperOptions?: DockerRunHelperOptions;
    associatedBuildTask?: DockerBuildTaskDefinition;
}

export class DockerRunTaskProvider implements TaskProvider {
    constructor(
        private readonly netCoreTaskHelper: NetCoreTaskHelper,
        private readonly nodeTaskHelper: NodeTaskHelper
    ) { }

    public provideTasks(token?: CancellationToken): ProviderResult<Task[]> {
        return []; // Intentionally empty, so that resolveTask gets used
    }

    public resolveTask(task: DockerRunTask, token?: CancellationToken): ProviderResult<Task> {
        const taskPlatform = getPlatform(task.definition);
        return callWithTelemetryAndErrorHandling(
            `docker-run/${taskPlatform || 'unknown'}`,
            async () => await this.resolveTaskInternal(task, taskPlatform, token));
    }

    // tslint:disable-next-line: no-any
    public async initializeRunTasks(folder: WorkspaceFolder, platform: Platform, options?: any): Promise<void> {
        options = options || {};
        let runTasks: DockerRunTaskDefinition[];

        switch (platform) {
            case '.NET Core Console':
            case 'ASP.NET Core':
                // tslint:disable-next-line: no-unsafe-any
                runTasks = await this.netCoreTaskHelper.provideDockerRunTasks(folder, options);
                break;
            case 'Node.js':
                // tslint:disable-next-line: no-unsafe-any
                runTasks = await this.nodeTaskHelper.provideDockerRunTasks(folder, options);
                break;
            default:
                throw new Error(`The platform '${platform}' is not currently supported for Docker run tasks.`);
        }

        for (const runTask of runTasks) {
            await addTask(runTask);
        }
    }

    private async resolveTaskInternal(task: DockerRunTask, taskPlatform: DockerPlatform, token?: CancellationToken): Promise<Task> {
        const definition = cloneObject(task.definition);
        definition.dockerRun = definition.dockerRun || {};

        const context: DockerRunTaskContext = {};
        const folder = task.scope as WorkspaceFolder;

        if (!folder) {
            throw new Error(`Unable to determine task scope to execute docker-run task '${task.name}'.`);
        }

        switch (taskPlatform) {
            case 'netCore':
                context.helperOptions = definition.netCore;
                context.associatedBuildTask = await getAssociatedDockerBuildTask(definition);
                definition.dockerRun = await this.netCoreTaskHelper.resolveDockerRunOptions(folder, definition.dockerRun, context, token);
                break;
            case 'node':
                context.helperOptions = definition.node;
                definition.dockerRun = await this.nodeTaskHelper.resolveDockerRunOptions(folder, definition.dockerRun, context, token);
                break;
            default:
                throw new Error(`Unrecognized platform '${definition.platform}'.`);
        }

        const commandLine = await this.resolveCommandLine(definition.dockerRun, token);
        return new Task(
            task.definition,
            task.scope,
            task.name,
            task.source,
            new ShellExecution(commandLine[0], commandLine.slice(1)),
            task.problemMatchers);
    }

    private async resolveCommandLine(runOptions: DockerRunOptions, token?: CancellationToken): Promise<ShellQuotedString[]> {
        return CommandLineBuilder
            .create('docker', 'run', '-dt')
            .withFlagArg('-P', runOptions.portsPublishAll || (runOptions.portsPublishAll === undefined && (runOptions.ports === undefined || runOptions.ports.length < 1)))
            .withNamedArg('--name', runOptions.containerName)
            .withNamedArg('--network', runOptions.network)
            .withNamedArg('--network-alias', runOptions.networkAlias)
            .withKeyValueArgs('-e', runOptions.env)
            .withArrayArgs('--env-file', runOptions.envFiles)
            .withKeyValueArgs('--label', runOptions.labels)
            .withArrayArgs('-v', runOptions.volumes, volume => `${volume.localPath}:${volume.containerPath}${volume.permissions ? ':' + volume.permissions : ''}`)
            .withArrayArgs('-p', runOptions.ports, port => `${port.hostPort ? port.hostPort + ':' : ''}${port.containerPort}${port.protocol ? '/' + port.protocol : ''}`)
            .withArrayArgs('--add-host', runOptions.extraHosts, extraHost => `${extraHost.hostname}:${extraHost.ip}`)
            .withNamedArg('--entrypoint', runOptions.entrypoint)
            .withQuotedArg(runOptions.image)
            .withArgs(runOptions.command)
            .buildShellQuotedStrings();
    }
}
