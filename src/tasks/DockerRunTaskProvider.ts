/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, ProviderResult, ShellExecution, ShellQuotedString, Task, TaskProvider, WorkspaceFolder } from 'vscode';
import { callWithTelemetryAndErrorHandling } from 'vscode-azureextensionui';
import { DockerPlatform, getPlatform } from '../debugging/DockerPlatformHelper';
import { cloneObject } from '../utils/cloneObject';
import { CommandLineBuilder } from '../utils/commandLineBuilder';
import { DockerRunOptions } from './DockerRunTaskDefinitionBase';
import { NetCoreRunTaskDefinition, NetCoreTaskHelper } from './netcore/NetCoreTaskHelper';
import { NodeRunTaskDefinition, NodeTaskHelper } from './node/NodeTaskHelper';
import { addTask, getAssociatedDockerBuildTask } from './TaskHelper';

export interface DockerRunTaskDefinition extends NetCoreRunTaskDefinition, NodeRunTaskDefinition {
    label?: string;
    dependsOn?: string[];
    dockerRun?: DockerRunOptions;
    platform?: DockerPlatform;
}

export interface DockerRunTask extends Task {
    definition: DockerRunTaskDefinition;
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

    public async initializeRunTasks(folder: WorkspaceFolder, platform: DockerPlatform): Promise<void> {
        let runTasks: DockerRunTaskDefinition[];

        switch (platform) {
            case 'netCore':
                runTasks = await this.netCoreTaskHelper.provideDockerRunTasks(folder);
                break;
            case 'node':
                runTasks = await this.nodeTaskHelper.provideDockerRunTasks(folder);
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

        const folder = task.scope as WorkspaceFolder;

        if (!folder) {
            throw new Error(`Unable to determine task scope to execute docker-run task '${task.name}'.`);
        }

        const associatedBuildTask = await getAssociatedDockerBuildTask(definition);

        switch (taskPlatform) {
            case 'netCore':
                definition.dockerRun = await this.netCoreTaskHelper.resolveDockerRunOptions(folder, associatedBuildTask, definition, token);
                break;
            case 'node':
                definition.dockerRun = await this.nodeTaskHelper.resolveDockerRunOptions(folder, associatedBuildTask, definition, token);
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
