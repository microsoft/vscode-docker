/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, ProviderResult, ShellExecution, ShellQuotedString, Task, TaskProvider, WorkspaceFolder } from 'vscode';
import { callWithTelemetryAndErrorHandling } from 'vscode-azureextensionui';
import { DockerPlatform, getPlatform } from '../debugging/DockerPlatformHelper';
import { cloneObject } from '../utils/cloneObject';
import { CommandLineBuilder } from '../utils/commandLineBuilder';
import { DockerBuildOptions } from './DockerBuildTaskDefinitionBase';
import { NetCoreBuildTaskDefinition } from './netcore/NetCoreTaskHelper';
import { NodeBuildTaskDefinition } from './node/NodeTaskHelper';
import { addTask, TaskHelper } from './TaskHelper';

export interface DockerBuildTaskDefinition extends NetCoreBuildTaskDefinition, NodeBuildTaskDefinition {
    label?: string;
    dependsOn?: string[];
    platform?: DockerPlatform;
}

export interface DockerBuildTask extends Task {
    definition: DockerBuildTaskDefinition;
}

export class DockerBuildTaskProvider implements TaskProvider {
    constructor(private readonly helpers: { [key in DockerPlatform]: TaskHelper }) {
    }

    public provideTasks(token?: CancellationToken): ProviderResult<Task[]> {
        return []; // Intentionally empty, so that resolveTask gets used
    }

    public resolveTask(task: DockerBuildTask, token?: CancellationToken): ProviderResult<Task> {
        const taskPlatform = getPlatform(task.definition);
        return callWithTelemetryAndErrorHandling(
            `docker-build/${taskPlatform || 'unknown'}`,
            async () => await this.resolveTaskInternal(task, taskPlatform, token));
    }

    public async initializeBuildTasks(folder: WorkspaceFolder, platform: DockerPlatform): Promise<void> {
        const helper = this.getHelper(platform);

        const buildTasks = await helper.provideDockerBuildTasks(folder);

        for (const buildTask of buildTasks) {
            await addTask(buildTask);
        }
    }

    private async resolveTaskInternal(task: DockerBuildTask, taskPlatform: DockerPlatform, token?: CancellationToken): Promise<Task> {
        const definition = cloneObject(task.definition);
        definition.dockerBuild = definition.dockerBuild || {};

        const folder = task.scope as WorkspaceFolder;

        if (!folder) {
            throw new Error(`Unable to determine task scope to execute docker-build task '${task.name}'.`);
        }

        const helper = this.getHelper(taskPlatform);

        definition.dockerBuild = await helper.resolveDockerBuildOptions(folder, definition, token);

        const commandLine = await this.resolveCommandLine(definition.dockerBuild, token);
        return new Task(
            task.definition,
            task.scope,
            task.name,
            task.source,
            new ShellExecution(commandLine[0], commandLine.slice(1)),
            task.problemMatchers);
    }

    private async resolveCommandLine(options: DockerBuildOptions, token?: CancellationToken): Promise<ShellQuotedString[]> {
        return CommandLineBuilder
            .create('docker', 'build', '--rm')
            .withFlagArg('--pull', options.pull)
            .withNamedArg('-f', options.dockerfile)
            .withKeyValueArgs('--build-arg', options.args)
            .withKeyValueArgs('--label', options.labels)
            .withNamedArg('-t', options.tag)
            .withNamedArg('--target', options.target)
            .withQuotedArg(options.context)
            .buildShellQuotedStrings();
    }

    private getHelper(platform: DockerPlatform): TaskHelper {
        const helper = this.helpers[platform];

        if (!helper) {
            throw new Error(`The platform '${platform}' is not currently supported for Docker build tasks.`);
        }

        return helper;
    }
}
