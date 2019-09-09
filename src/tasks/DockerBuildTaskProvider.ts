/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import { CancellationToken, ProviderResult, ShellExecution, ShellQuotedString, Task, TaskProvider, WorkspaceFolder } from 'vscode';
import { callWithTelemetryAndErrorHandling, IActionContext } from 'vscode-azureextensionui';
import { DockerPlatform, getPlatform } from '../debugging/DockerPlatformHelper';
import { cloneObject } from '../utils/cloneObject';
import { CommandLineBuilder } from '../utils/commandLineBuilder';
import { resolveFilePath } from '../utils/resolveFilePath';
import { DockerBuildOptions } from './DockerBuildTaskDefinitionBase';
import { NetCoreBuildTaskDefinition } from './netcore/NetCoreTaskHelper';
import { NodeBuildTaskDefinition } from './node/NodeTaskHelper';
import { DockerBuildTaskContext, TaskHelper } from './TaskHelper';

export interface DockerBuildTaskDefinition extends NetCoreBuildTaskDefinition, NodeBuildTaskDefinition {
    label?: string;
    dependsOn?: string[];
    platform?: DockerPlatform;
}

export interface DockerBuildTask extends Task {
    definition: DockerBuildTaskDefinition;
}

export class DockerBuildTaskProvider implements TaskProvider {
    constructor(private readonly helpers: { [key in DockerPlatform]: TaskHelper }) { }

    public provideTasks(token?: CancellationToken): ProviderResult<Task[]> {
        return []; // Intentionally empty, so that resolveTask gets used
    }

    public resolveTask(task: DockerBuildTask, token?: CancellationToken): ProviderResult<Task> {
        const taskPlatform = getPlatform(task.definition);
        return callWithTelemetryAndErrorHandling(
            `docker-build-resolve/${taskPlatform || 'unknown'}`,
            async (actionContext: IActionContext) => await this.resolveTaskInternal(
                {
                    folder: task.scope as WorkspaceFolder,
                    platform: taskPlatform,
                    actionContext: actionContext,
                    cancellationToken: token,
                },
                task));
    }

    // TODO: Skip if image is freshly built
    private async resolveTaskInternal(context: DockerBuildTaskContext, task: DockerBuildTask): Promise<Task> {
        context.actionContext.telemetry.properties.platform = context.platform;

        const definition = cloneObject(task.definition);
        definition.dockerBuild = definition.dockerBuild || {};

        if (!context.folder) {
            throw new Error(`Unable to determine task scope to execute docker-build task '${task.name}'.`);
        }

        const helper = this.getHelper(context.platform);

        definition.dockerBuild = await helper.resolveDockerBuildOptions(context, definition);
        await this.validateResolvedDefinition(context, definition.dockerBuild);

        const commandLine = await this.resolveCommandLine(definition.dockerBuild);
        // TODO : addDockerSettingsToEnv?
        return new Task(
            task.definition,
            task.scope,
            task.name,
            task.source,
            new ShellExecution(commandLine[0], commandLine.slice(1)),
            task.problemMatchers);
    }

    private async validateResolvedDefinition(context: DockerBuildTaskContext, dockerBuild: DockerBuildOptions): Promise<void> {
        if (!dockerBuild.tag) {
            throw new Error('No Docker image name was provided or resolved.');
        }

        if (!dockerBuild.context) {
            throw new Error('No Docker build context was provided or resolved.');
        } else if (!await fse.pathExists(resolveFilePath(dockerBuild.context, context.folder))) {
            throw new Error(`The Docker build context \'${dockerBuild.context}\' does not exist or could not be accessed.`);
        }

        if (!dockerBuild.dockerfile) {
            throw new Error('No Dockerfile was provided or resolved.');
        } else if (!await fse.pathExists(resolveFilePath(dockerBuild.dockerfile, context.folder))) {
            throw new Error(`The Dockerfile \'${dockerBuild.dockerfile}\' does not exist or could not be accessed.`);
        }
    }

    private async resolveCommandLine(options: DockerBuildOptions): Promise<ShellQuotedString[]> {
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
