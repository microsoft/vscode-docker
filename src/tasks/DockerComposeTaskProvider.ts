/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { Task } from 'vscode';
import { isNewContextType } from '../docker/Contexts';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { cloneObject } from '../utils/cloneObject';
import { CommandLineBuilder } from '../utils/commandLineBuilder';
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
    public constructor() { super('docker-build', undefined) }

    protected async executeTaskInternal(context: DockerComposeTaskContext, task: DockerComposeTask): Promise<void> {
        const definition = cloneObject(task.definition);
        definition.dockerCompose = definition.dockerCompose || {};
        definition.dockerCompose.files = definition.dockerCompose.files || [];

        await this.validateResolvedDefinition(context, definition.dockerCompose);

        const commandLine = await this.resolveCommandLine(definition.dockerCompose);

        // Because BuildKit outputs everything to stderr, we will not treat output there as a failure
        await context.terminal.executeCommandInTerminal(
            commandLine,
            context.folder,
            false, // rejectOnStderr
            undefined, // stdoutBuffer
            Buffer.alloc(10 * 1024), // stderrBuffer
            context.cancellationToken
        );
        throwIfCancellationRequested(context);
    }

    private async validateResolvedDefinition(context: DockerComposeTaskContext, dockerCompose: DockerComposeOptions): Promise<void> {
        if (!dockerCompose.up && !dockerCompose.down) {
            throw new Error(localize('vscode-docker.tasks.composeProvider.noUpOrDown', 'Neither the "up" or "down" properties are present in the docker-compose task.'));
        }

        if (dockerCompose.files.some(async (f) => await fse.pathExists(path.resolve(context.folder.uri.fsPath, resolveVariables(f, context.folder))))) {
            throw new Error(localize('vscode-docker.tasks.composeProvider.invalidFile', 'One or more docker-compose files does not exist or could not be accessed.'));
        }
    }

    private async resolveCommandLine(options: DockerComposeOptions): Promise<CommandLineBuilder> {
        const isNewContext = isNewContextType((await ext.dockerContextManager.getCurrentContext()).Type);

        if (options.up) {
            return CommandLineBuilder
                .create(isNewContext ? 'docker compose' : 'docker-compose')
                .withArrayArgs('-f', options.files)
                .withArg('up')
                .withFlagArg('--detach', !!options.up.detached)
                .withFlagArg('--build', !!options.up.build)
                .withArg(options.up.customOptions)
                .withArg(options.up.services.join(' '));
        } else {
            // Validation earlier guarantees that if up is not defined, down must be
            return CommandLineBuilder
                .create(isNewContext ? 'docker compose' : 'docker-compose')
                .withArrayArgs('-f', options.files)
                .withArg('down')
                .withNamedArg('--rmi', options.down.removeImages)
                .withFlagArg('--volumes', options.down.removeVolumes)
                .withArg(options.up.customOptions);
        }
    }
}
