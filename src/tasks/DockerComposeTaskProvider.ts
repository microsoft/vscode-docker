/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { l10n, Task } from 'vscode';
import { ext } from '../extensionVariables';
import { VoidCommandResponse } from '../runtimes/docker';
import { cloneObject } from '../utils/cloneObject';
import { resolveVariables } from '../utils/resolveVariables';
import { DockerComposeOptions, DockerComposeTaskDefinitionBase } from './DockerComposeTaskDefinitionBase';
import { DockerTaskProvider } from './DockerTaskProvider';
import { DockerComposeTaskContext, throwIfCancellationRequested } from './TaskHelper';

// This doesn't need to be extended so redefining for parity is simplest
export type DockerComposeTaskDefinition = DockerComposeTaskDefinitionBase;

export interface DockerComposeTask extends Task {
    definition: DockerComposeTaskDefinition;
}

export class DockerComposeTaskProvider extends DockerTaskProvider {
    public constructor() { super('docker-compose', undefined); }

    protected async executeTaskInternal(context: DockerComposeTaskContext, task: DockerComposeTask): Promise<void> {
        const definition = cloneObject(task.definition);
        definition.dockerCompose = definition.dockerCompose || {};
        definition.dockerCompose.files = definition.dockerCompose.files || [];

        // Fix wrong environment file option name
        definition.dockerCompose.envFile = this.normalizeEnvFile(definition.dockerCompose);
        definition.dockerCompose.envFiles = undefined;

        await this.validateResolvedDefinition(context, definition.dockerCompose);

        const client = await ext.orchestratorManager.getClient();

        const options = definition.dockerCompose;
        let command: VoidCommandResponse;
        if (definition.dockerCompose.up) {
            command = await client.up({
                files: options.files,
                environmentFile: options.envFile,
                profiles: options.up.profiles,
                projectName: options.projectName,
                detached: options.up.detached,
                build: options.up.build,
                scale: options.up.scale,
                customOptions: options.up.customOptions,
                services: options.up.services,
            });
        } else {
            command = await client.down({
                files: options.files,
                environmentFile: options.envFile,
                projectName: options.projectName,
                removeImages: options.down.removeImages,
                removeVolumes: options.down.removeVolumes,
                customOptions: options.down.customOptions,
            });
        }

        const runner = context.terminal.getCommandRunner({
            folder: context.folder,
            token: context.cancellationToken,
        });

        await runner(command);
        throwIfCancellationRequested(context);
    }

    private async validateResolvedDefinition(context: DockerComposeTaskContext, dockerCompose: DockerComposeOptions): Promise<void> {
        if (dockerCompose.up && dockerCompose.down) {
            throw new Error(l10n.t('Both "up" and "down" properties are present in the docker-compose task.'));
        }

        if (!dockerCompose.up && !dockerCompose.down) {
            throw new Error(l10n.t('Neither "up" nor "down" properties are present in the docker-compose task.'));
        }

        if (dockerCompose.up?.services && dockerCompose.up?.profiles) {
            throw new Error(l10n.t('Both "services" and "profiles" are present in the docker-compose task\'s "up" property.'));
        }

        for (const file of dockerCompose.files) {
            if (!(await fse.pathExists(path.resolve(context.folder.uri.fsPath, resolveVariables(file, context.folder))))) {
                throw new Error(l10n.t('One or more docker-compose files does not exist or could not be accessed.'));
            }
        }

        if (dockerCompose.envFile && !(await fse.pathExists(path.resolve(context.folder.uri.fsPath, resolveVariables(dockerCompose.envFile, context.folder))))) {
            throw new Error(l10n.t('Environment file does not exist or could not be accessed.'));
        }
    }

    private normalizeEnvFile(options: DockerComposeOptions): string {
        if (options.envFile) {
            // If the new option is specified, always use it
            return options.envFile;
        } else if (options.envFiles?.length) {
            // Otherwise use the old option if it is specified
            // Compose' behavior is to ignore all prior entries and use only the last environment file
            return options.envFiles[options.envFiles.length - 1];
        } else {
            return undefined;
        }
    }
}
