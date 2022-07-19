/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommandLineArgs, CommandNotSupportedError, DockerClient } from '@microsoft/container-runtimes';
import { IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { TaskCommandRunnerFactory } from '../runtimes/runners/TaskCommandRunnerFactory';

export async function throwIfNotInDocker(context: IActionContext): Promise<void> {
    const client = await ext.runtimeManager.getClient();

    if (client.id !== DockerClient.ClientId) {
        context.errorHandling.suppressReportIssue = true;
        throw new CommandNotSupportedError(
            localize(
                'vscode-docker.commands.registries.azure.deployImageToAci.dockerOnly',
                'Azure Container Instances commands can only be used with Docker Desktop.'
            )
        );
    }
}

export async function executeAciCommandAsTask(command: string, args: CommandLineArgs, title: string): Promise<void> {
    const taskCRF = new TaskCommandRunnerFactory({
        taskName: title,
        rejectOnError: true,
    });

    await taskCRF.getCommandRunner()(
        {
            command,
            args,
        }
    );
}

export function flattenCommandLineArgs(args: CommandLineArgs): string {
    return args.map(a => a.value).join(' ');
}
