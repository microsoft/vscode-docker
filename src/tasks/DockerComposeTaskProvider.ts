/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { Task } from 'vscode';
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
    public constructor() { super('docker-compose', undefined); }

    protected async executeTaskInternal(context: DockerComposeTaskContext, task: DockerComposeTask): Promise<void> {
        const definition = cloneObject(task.definition);
        definition.dockerCompose = definition.dockerCompose || {};
        definition.dockerCompose.files = definition.dockerCompose.files || [];

        // Fix wrong environment file option name
        definition.dockerCompose.envFile = this.normalizeEnvFile(definition.dockerCompose);
        definition.dockerCompose.envFiles = undefined;

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
        if (dockerCompose.up && dockerCompose.down) {
            throw new Error(localize('vscode-docker.tasks.composeProvider.bothUpAndDown', 'Both "up" and "down" properties are present in the docker-compose task.'));
        }

        if (!dockerCompose.up && !dockerCompose.down) {
            throw new Error(localize('vscode-docker.tasks.composeProvider.noUpOrDown', 'Neither "up" nor "down" properties are present in the docker-compose task.'));
        }

        if (dockerCompose.up?.services && dockerCompose.up?.profiles) {
            throw new Error(localize('vscode-docker.tasks.composeProvider.bothServicesAndProfiles', 'Both "services" and "profiles" are present in the docker-compose task\'s "up" property.'));
        }

        for (const file of dockerCompose.files) {
            if (!(await fse.pathExists(path.resolve(context.folder.uri.fsPath, resolveVariables(file, context.folder))))) {
                throw new Error(localize('vscode-docker.tasks.composeProvider.invalidFile', 'One or more docker-compose files does not exist or could not be accessed.'));
            }
        }

        if (dockerCompose.envFile && !(await fse.pathExists(path.resolve(context.folder.uri.fsPath, resolveVariables(dockerCompose.envFile, context.folder))))) {
            throw new Error(localize('vscode-docker.tasks.composeProvider.invalidEnvFile', 'Environment file does not exist or could not be accessed.'));
        }
    }

    private async resolveCommandLine(options: DockerComposeOptions): Promise<CommandLineBuilder> {
        if (options.up) {
            // CommandLineBuilder requires key-value objects to be string => string, but scale is string => number
            // So, convert it to string => string
            const scaleAsString: { [key: string]: string } = {};
            if (options.up.scale) {
                for (const key of Object.keys(options.up.scale)) {
                    scaleAsString[key] = options.up.scale[key].toString();
                }
            }

            return CommandLineBuilder
                .create(await ext.dockerContextManager.getComposeCommand())
                .withArrayArgs('-f', options.files)
                .withNamedArg('--env-file', options.envFile)
                .withArrayArgs('--profile', options.up.profiles)
                .withNamedArg('--project-name', options.projectName)
                .withArg('up')
                .withFlagArg('--detach', !!options.up.detached)
                .withFlagArg('--build', !!options.up.build)
                .withKeyValueArgs('--scale', scaleAsString)
                .withArg(options.up.customOptions)
                .withArg(options.up.services?.join(' '));
        } else {
            // Validation earlier guarantees that if up is not defined, down must be
            return CommandLineBuilder
                .create(await ext.dockerContextManager.getComposeCommand())
                .withArrayArgs('-f', options.files)
                .withNamedArg('--env-file', options.envFile)
                .withNamedArg('--project-name', options.projectName)
                .withArg('down')
                .withNamedArg('--rmi', options.down.removeImages)
                .withFlagArg('--volumes', options.down.removeVolumes)
                .withArg(options.down.customOptions);
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
