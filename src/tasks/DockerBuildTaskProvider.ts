/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { l10n, Task } from 'vscode';
import { DockerPlatform } from '../debugging/DockerPlatformHelper';
import { ext } from '../extensionVariables';
import { cloneObject } from '../utils/cloneObject';
import { resolveVariables } from '../utils/resolveVariables';
import { DockerBuildOptions } from './DockerBuildTaskDefinitionBase';
import { DockerTaskProvider } from './DockerTaskProvider';
import { NetCoreBuildTaskDefinition } from './netcore/NetCoreTaskHelper';
import { NodeBuildTaskDefinition } from './node/NodeTaskHelper';
import { defaultVsCodeLabels, getAggregateLabels } from './TaskDefinitionBase';
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
    public constructor(helpers: { [key in DockerPlatform]: TaskHelper }) { super('docker-build', helpers); }

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

        const client = await ext.runtimeManager.getClient();

        const options = definition.dockerBuild;
        const command = await client.buildImage({
            pull: options.pull,
            file: options.dockerfile,
            args: options.buildArgs,
            labels: getAggregateLabels(options.labels, defaultVsCodeLabels),
            tags: [options.tag],
            stage: options.target,
            customOptions: options.customOptions,
            path: options.context,
        });

        const runner = context.terminal.getCommandRunner({
            folder: context.folder,
            token: context.cancellationToken,
        });

        await runner(command);
        throwIfCancellationRequested(context);

        context.imageName = definition.dockerBuild.tag;

        if (helper && helper.postBuild) {
            await helper.postBuild(context, definition);
        }
    }

    private async validateResolvedDefinition(context: DockerBuildTaskContext, dockerBuild: DockerBuildOptions): Promise<void> {
        if (!dockerBuild.context) {
            throw new Error(l10n.t('No Docker build context was provided or resolved.'));
        } else if (!await fse.pathExists(path.resolve(context.folder.uri.fsPath, resolveVariables(dockerBuild.context, context.folder)))) {
            throw new Error(l10n.t('The Docker build context \'{0}\' does not exist or could not be accessed.', dockerBuild.context));
        }

        if (dockerBuild.dockerfile && !await fse.pathExists(path.resolve(context.folder.uri.fsPath, resolveVariables(dockerBuild.dockerfile, context.folder)))) {
            throw new Error(l10n.t('The Dockerfile \'{0}\' does not exist or could not be accessed.', dockerBuild.dockerfile));
        }
    }
}
