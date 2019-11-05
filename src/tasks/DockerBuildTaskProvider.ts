/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import { Task } from 'vscode';
import { DockerPlatform } from '../debugging/DockerPlatformHelper';
import { cloneObject } from '../utils/cloneObject';
import { CommandLineBuilder } from '../utils/commandLineBuilder';
import { resolveVariables } from '../utils/resolveVariables';
import { DockerBuildOptions } from './DockerBuildTaskDefinitionBase';
import { DockerTaskProvider } from './DockerTaskProvider';
import { NetCoreBuildTaskDefinition } from './netcore/NetCoreTaskHelper';
import { NodeBuildTaskDefinition } from './node/NodeTaskHelper';
import { DockerBuildTaskContext, TaskHelper, throwIfCancellationRequested } from './TaskHelper';

export interface DockerBuildTaskDefinition extends NetCoreBuildTaskDefinition, NodeBuildTaskDefinition {
    label?: string;
    dependsOn?: string[];
    platform?: DockerPlatform;
}

export interface DockerBuildTask extends Task {
    definition: DockerBuildTaskDefinition;
}

export class DockerBuildTaskProvider extends DockerTaskProvider {
    constructor(helpers: { [key in DockerPlatform]: TaskHelper }) { super('docker-build', helpers) }

    // TODO: Skip if image is freshly built
    protected async executeTaskInternal(context: DockerBuildTaskContext, task: DockerBuildTask): Promise<void> {
        const definition = cloneObject(task.definition);
        definition.dockerBuild = definition.dockerBuild || {};

        const helper = this.getHelper(context.platform);

        if (helper && helper.preBuild) {
            await helper.preBuild(context, definition);
            throwIfCancellationRequested(context);
        }

        if (helper) {
            definition.dockerBuild = await helper.getDockerBuildOptions(context, definition);
            throwIfCancellationRequested(context);
        }

        await this.validateResolvedDefinition(context, definition.dockerBuild);

        const commandLine = await this.resolveCommandLine(definition.dockerBuild);

        // Because BuildKit outputs everything to stderr, we will not treat output there as a failure
        await context.terminal.executeCommandInTerminal(
            commandLine,
            context.folder,
            false, // rejectOnStderr
            undefined, // stdoutBuffer
            undefined, // stderrBuffer
            context.cancellationToken
        );
        throwIfCancellationRequested(context);

        context.imageName = definition.dockerBuild.tag;

        if (helper && helper.postBuild) {
            await helper.postBuild(context, definition);
        }
    }

    private async validateResolvedDefinition(context: DockerBuildTaskContext, dockerBuild: DockerBuildOptions): Promise<void> {
        if (!dockerBuild.tag) {
            throw new Error('No Docker image name was provided or resolved.');
        }

        if (!dockerBuild.context) {
            throw new Error('No Docker build context was provided or resolved.');
        } else if (!await fse.pathExists(resolveVariables(dockerBuild.context, context.folder))) {
            throw new Error(`The Docker build context \'${dockerBuild.context}\' does not exist or could not be accessed.`);
        }

        if (!dockerBuild.dockerfile) {
            throw new Error('No Dockerfile was provided or resolved.');
        } else if (!await fse.pathExists(resolveVariables(dockerBuild.dockerfile, context.folder))) {
            throw new Error(`The Dockerfile \'${dockerBuild.dockerfile}\' does not exist or could not be accessed.`);
        }
    }

    private async resolveCommandLine(options: DockerBuildOptions): Promise<CommandLineBuilder> {
        return CommandLineBuilder
            .create('docker', 'build', '--rm')
            .withFlagArg('--pull', options.pull)
            .withNamedArg('-f', options.dockerfile)
            .withKeyValueArgs('--build-arg', options.buildArgs)
            .withKeyValueArgs('--label', options.labels)
            .withNamedArg('-t', options.tag)
            .withNamedArg('--target', options.target)
            .withQuotedArg(options.context);
    }
}
