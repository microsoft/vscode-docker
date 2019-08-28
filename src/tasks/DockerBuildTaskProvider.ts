/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, ProviderResult, ShellExecution, ShellQuotedString, Task, TaskDefinition, TaskProvider, WorkspaceFolder } from 'vscode';
import { callWithTelemetryAndErrorHandling } from 'vscode-azureextensionui';
import { cloneObject } from '../utils/cloneObject';
import { CommandLineBuilder } from '../utils/commandLineBuilder';
import { Platform } from '../utils/platform';
import { NetCoreTaskHelper, NetCoreTaskOptions } from './netcore/NetCoreTaskHelper';
import { NodeTaskBuildOptions, NodeTaskHelper } from './node/NodeTaskHelper';
import { addTask, TaskPlatform } from './TaskHelper';

export interface DockerBuildOptions {
    args?: { [key: string]: string };
    context?: string;
    dockerfile?: string;
    labels?: { [key: string]: string };
    tag?: string;
    target?: string;
    pull?: boolean;
}

export interface DockerBuildTaskDefinition extends TaskDefinition {
    label?: string;
    dependsOn?: string[];
    dockerBuild?: DockerBuildOptions;
    platform?: TaskPlatform;
    netCore?: NetCoreTaskOptions;
    node?: NodeTaskBuildOptions;
}

export interface DockerBuildTask extends Task {
    definition: DockerBuildTaskDefinition;
}

// tslint:disable-next-line: no-empty-interface
export interface DockerBuildHelperOptions {
}

export interface DockerBuildTaskContext {
    helperOptions?: DockerBuildHelperOptions;
}

export class DockerBuildTaskProvider implements TaskProvider {
    constructor(
        private readonly netCoreTaskHelper: NetCoreTaskHelper,
        private readonly nodeTaskHelper: NodeTaskHelper
    ) { }

    public provideTasks(token?: CancellationToken): ProviderResult<Task[]> {
        return []; // Intentionally empty, so that resolveTask gets used
    }

    public resolveTask(task: DockerBuildTask, token?: CancellationToken): ProviderResult<Task> {
        const taskPlatform = DockerBuildTaskProvider.determineTaskPlatform(task);
        return callWithTelemetryAndErrorHandling(
            `docker-build/${taskPlatform}`,
            async () => await this.resolveTaskInternal(task, taskPlatform, token));
    }

    // tslint:disable-next-line: no-any
    public async initializeBuildTasks(folder: WorkspaceFolder, platform: Platform, options?: any): Promise<void> {
        options = options || {};
        let buildTasks: DockerBuildTaskDefinition[];

        switch (platform) {
            case '.NET Core Console':
            case 'ASP.NET Core':
                // tslint:disable-next-line: no-unsafe-any
                buildTasks = await this.netCoreTaskHelper.provideDockerBuildTasks(folder, options);
                break;
            case 'Node.js':
                // tslint:disable-next-line: no-unsafe-any
                buildTasks = await this.nodeTaskHelper.provideDockerBuildTasks(folder, options);
                break;
            default:
                throw new Error(`The platform '${platform}' is not currently supported for Docker build tasks.`);
        }

        for (const buildTask of buildTasks) {
            await addTask(buildTask);
        }
    }

    private async resolveTaskInternal(task: DockerBuildTask, taskPlatform: TaskPlatform, token?: CancellationToken): Promise<Task> {
        const definition = cloneObject(task.definition);
        definition.dockerBuild = definition.dockerBuild || {};

        const context: DockerBuildTaskContext = {};

        if (task.scope as WorkspaceFolder !== undefined) {
            switch (taskPlatform) {
                case 'netCore':
                    context.helperOptions = definition.netCore;
                    definition.dockerBuild = await this.netCoreTaskHelper.resolveDockerBuildOptions(task.scope as WorkspaceFolder, definition.dockerBuild, context, token);
                    break;
                case 'node':
                    context.helperOptions = definition.node;
                    definition.dockerBuild = await this.nodeTaskHelper.resolveDockerBuildOptions(task.scope as WorkspaceFolder, definition.dockerBuild, context, token);
                    break;
                default:
                    throw new Error(`Unrecognized platform '${definition.platform}'.`);
            }
        } else {
            throw new Error(`Unable to determine task scope to execute docker-build task '${task.name}'.`);
        }

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

    private static determineTaskPlatform(task: DockerBuildTask): TaskPlatform {
        if (task.definition.platform === 'netCore' || task.definition.netCore !== undefined) {
            return 'netCore'
        } else if (task.definition.platform === 'node' || task.definition.node !== undefined) {
            return 'node';
        }

        return 'unknown';
    }
}
