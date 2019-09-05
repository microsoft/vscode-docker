/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, ProviderResult, ShellExecution, ShellQuotedString, Task, TaskProvider, WorkspaceFolder } from 'vscode';
import { callWithTelemetryAndErrorHandling, IActionContext } from 'vscode-azureextensionui';
import { DockerPlatform, getPlatform } from '../debugging/DockerPlatformHelper';
import { cloneObject } from '../utils/cloneObject';
import { CommandLineBuilder } from '../utils/commandLineBuilder';
import { DockerRunOptions } from './DockerRunTaskDefinitionBase';
import { NetCoreRunTaskDefinition } from './netcore/NetCoreTaskHelper';
import { NodeRunTaskDefinition } from './node/NodeTaskHelper';
import { DockerRunTaskContext, getAssociatedDockerBuildTask, TaskHelper } from './TaskHelper';

export interface DockerRunTaskDefinition extends NetCoreRunTaskDefinition, NodeRunTaskDefinition {
    label?: string;
    dependsOn?: string[];
    platform?: DockerPlatform;
}

export interface DockerRunTask extends Task {
    definition: DockerRunTaskDefinition;
}

export class DockerRunTaskProvider implements TaskProvider {
    constructor(private readonly helpers: { [key in DockerPlatform]: TaskHelper }) { }

    public provideTasks(token?: CancellationToken): ProviderResult<Task[]> {
        return []; // Intentionally empty, so that resolveTask gets used
    }

    public resolveTask(task: DockerRunTask, token?: CancellationToken): ProviderResult<Task> {
        const taskPlatform = getPlatform(task.definition);
        return callWithTelemetryAndErrorHandling(
            `docker-run-resolve/${taskPlatform || 'unknown'}`,
            async (actionContext: IActionContext) => await this.resolveTaskInternal(
                {
                    folder: task.scope as WorkspaceFolder,
                    platform: taskPlatform,
                    actionContext: actionContext,
                    cancellationToken: token,
                },
                task));
    }

    // TODO: Can we skip if a recently-started image exists?
    private async resolveTaskInternal(context: DockerRunTaskContext, task: DockerRunTask): Promise<Task> {
        context.actionContext.telemetry.properties.platform = context.platform;

        const definition = cloneObject(task.definition);
        definition.dockerRun = definition.dockerRun || {};

        if (!context.folder) {
            throw new Error(`Unable to determine task scope to execute docker-run task '${task.name}'.`);
        }

        context.buildDefinition = await getAssociatedDockerBuildTask(definition);

        const helper = this.getHelper(context.platform);

        definition.dockerRun = await helper.resolveDockerRunOptions(context, definition);
        await this.validateResolvedDefinition(context, definition.dockerRun);

        const commandLine = await this.resolveCommandLine(definition.dockerRun);
        // TODO : addDockerSettingsToEnv?
        return new Task(
            task.definition,
            task.scope,
            task.name,
            task.source,
            new ShellExecution(commandLine[0], commandLine.slice(1)),
            task.problemMatchers);
    }

    private async validateResolvedDefinition(context: DockerRunTaskContext, dockerRun: DockerRunOptions): Promise<void> {
        if (!dockerRun.image) {
            throw new Error('No Docker image name was resolved.');
        }
    }

    private async resolveCommandLine(runOptions: DockerRunOptions): Promise<ShellQuotedString[]> {
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

    private getHelper(platform: DockerPlatform): TaskHelper {
        const helper = this.helpers[platform];

        if (!helper) {
            throw new Error(`The platform '${platform}' is not currently supported for Docker run tasks.`);
        }

        return helper;
    }
}
