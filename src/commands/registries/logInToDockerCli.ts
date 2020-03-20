/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { exec } from 'child_process';
import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { NULL_GUID } from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from "../../localize";
import { registryExpectedContextValues } from '../../tree/registries/registryContextValues';
import { RegistryTreeItemBase } from '../../tree/registries/RegistryTreeItemBase';

export async function logInToDockerCli(context: IActionContext, node?: RegistryTreeItemBase): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<RegistryTreeItemBase>(registryExpectedContextValues.all.registry, context);
    }

    let creds = await node.getDockerCliCredentials();
    let auth: { username?: string, password?: string, token?: string } = creds.auth || {};
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
        ext.outputChannel.appendLine(localize('vscode-docker.commands.registries.logIn.skipping', 'WARNING: Skipping login for "{0}" because it does not require authentication.', creds.registryPath))
    } else {
        const progressOptions: vscode.ProgressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: localize('vscode-docker.commands.registries.logIn.loggingIn', 'Logging in...'),
        };

        await vscode.window.withProgress(progressOptions, async () =>
            await new Promise((resolve, reject) => {
                const dockerLoginCmd = `docker login ${creds.registryPath} --username ${username} --password-stdin`;
                let childProcess = exec(dockerLoginCmd, (err, stdout, stderr) => {
                    ext.outputChannel.appendLine(dockerLoginCmd);
                    ext.outputChannel.append(stdout);
                    ext.outputChannel.append(stderr);
                    if (err && err.message.match(/error storing credentials.*The stub received bad data/)) {
                        // Temporary work-around for this error- same as Azure CLI
                        // See https://github.com/Azure/azure-cli/issues/4843
                        reject(new Error(localize('vscode-docker.commands.registries.logIn.dockerCliTokens', 'In order to log in to the Docker CLI using tokens, you currently need to go to \nOpen your Docker config file and remove "credsStore": "wincred" from the config.json file, then try again. \nDoing this will disable wincred and cause Docker to store credentials directly in the .docker/config.json file. All registries that are currently logged in will be effectly logged out.')));
                    } else if (err) {
                        reject(err);
                    } else {
                        // Docker emits some non-error warning messages to stderr, so we cannot reject on all stderr without failing unnecessarily
                        // Consequently, as long as exit code is 0, we will resolve
                        // Note that both stdout and stderr are logged unconditionally above
                        resolve();
                    }
                });

                childProcess.stdin.write(password); // Prevents insecure password error
                childProcess.stdin.end();
            })
        );
    }

    ext.outputChannel.show();
}
