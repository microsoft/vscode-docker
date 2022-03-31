/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, parseError } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { NULL_GUID } from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from "../../localize";
import { registryExpectedContextValues } from '../../tree/registries/registryContextValues';
import { RegistryTreeItemBase } from '../../tree/registries/RegistryTreeItemBase';
import { CommandLineBuilder } from '../../utils/commandLineBuilder';
import { execAsync } from '../../utils/spawnAsync';

export async function logInToDockerCli(context: IActionContext, node?: RegistryTreeItemBase): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<RegistryTreeItemBase>(registryExpectedContextValues.all.registry, context);
    }

    const creds = await node.getDockerCliCredentials();
    const auth: { username?: string, password?: string, token?: string } = creds.auth || {};
    let username: string | undefined;
    let password: string | undefined;
    if (auth.token) {
        username = NULL_GUID;
        password = auth.token;
    } else if (auth.password) {
        username = auth.username;
        password = auth.password;
    }

    if (!username || !password) {
        ext.outputChannel.appendLine(localize('vscode-docker.commands.registries.logIn.skipping', 'WARNING: Skipping login for "{0}" because it does not require authentication.', creds.registryPath));
    } else {
        const progressOptions: vscode.ProgressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: localize('vscode-docker.commands.registries.logIn.loggingIn', 'Logging in...'),
        };

        await vscode.window.withProgress(progressOptions, async () => {
            let command = CommandLineBuilder.create(ext.dockerContextManager.getDockerCommand(context), 'login');

            if (creds.registryPath) {
                command = command.withQuotedArg(creds.registryPath);
            }

            command = command
                .withNamedArg('--username', { value: username, quoting: vscode.ShellQuoting.Strong })
                .withArg('--password-stdin');

            try {
                await execAsync(command.build(), { stdin: password });
                ext.outputChannel.appendLine('Login succeeded.');
            } catch (err) {
                const error = parseError(err);

                if (/error storing credentials.*The stub received bad data/i.test(error.message)) {
                    // Temporary work-around for this error- same as Azure CLI
                    // See https://github.com/Azure/azure-cli/issues/4843
                    context.errorHandling.suppressReportIssue = true;
                    throw new Error(localize('vscode-docker.commands.registries.logIn.dockerCliTokens', 'In order to log in to the Docker CLI using tokens, you currently need to go to your Docker config file and remove `"credsStore": "wincred"`, then try again. \nDoing this will disable wincred and cause Docker to store credentials directly in the .docker/config.json file. All registries that are currently logged in will be logged out.'));
                } else {
                    throw err;
                }
            }
        });
    }

    ext.outputChannel.show();
}
