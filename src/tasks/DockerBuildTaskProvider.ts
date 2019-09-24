/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import { Task } from 'vscode';
import { DockerPlatform } from '../debugging/DockerPlatformHelper';
import { cloneObject } from '../utils/cloneObject';
import { CommandLineBuilder } from '../utils/commandLineBuilder';
import { resolveFilePath } from '../utils/resolveFilePath';
import { DockerBuildOptions } from './DockerBuildTaskDefinitionBase';
import { DockerTaskProviderBase } from './DockerTaskProviderBase';
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

export class DockerBuildTaskProvider extends DockerTaskProviderBase {
    constructor(helpers: { [key in DockerPlatform]: TaskHelper }) { super('docker-build', helpers) }

    // TODO: Skip if image is freshly built
    protected async executeTaskInternal(context: DockerBuildTaskContext, task: DockerBuildTask): Promise<void> {
        const definition = cloneObject(task.definition);
        definition.dockerBuild = definition.dockerBuild || {};

        const helper = this.getHelper(context.platform);

        if (helper.preBuild) {
            await helper.preBuild(context, definition);
            throwIfCancellationRequested(context);
        }

        definition.dockerBuild = await helper.getDockerBuildOptions(context, definition);
        await this.validateResolvedDefinition(context, definition.dockerBuild);
        throwIfCancellationRequested(context);

        const commandLine = await this.resolveCommandLine(definition.dockerBuild);

        // TODO: process errors from docker build so that warnings aren't fatal
        await context.shell.executeCommandInTerminal(commandLine, true, context.cancellationToken);
        throwIfCancellationRequested(context);

        if (helper.postBuild) {
            // TODO: attach results to context
            await helper.postBuild(context, definition);
        }
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
