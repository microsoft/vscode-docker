/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, parseError } from '@microsoft/vscode-azext-utils';
import { CommonRegistry } from '@microsoft/vscode-docker-registries';
import * as stream from 'stream';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { UnifiedRegistryItem } from '../../tree/registries/UnifiedRegistryTreeDataProvider';
import { registryExperience } from '../../utils/registryExperience';

export async function logInToDockerCli(context: IActionContext, node?: UnifiedRegistryItem<CommonRegistry>): Promise<void> {
    if (!node) {
        node = await registryExperience<CommonRegistry>(context, { contextValueFilter: { include: /commonregistry/i } });
    }

    const creds = await node.provider?.getLoginInformation?.(node.wrappedItem);
    const username = creds?.username;
    const secret = creds?.secret;
    const server = creds?.server;

    if (!username || !secret) {
        ext.outputChannel.warn(vscode.l10n.t('Skipping login for "{0}" because it does not require authentication.', node.provider.label));
    } else {
        const progressOptions: vscode.ProgressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: vscode.l10n.t('Logging in...'),
        };

        await vscode.window.withProgress(progressOptions, async () => {
            try {
                await ext.runWithDefaults(
                    client => client.login({
                        username: username,
                        passwordStdIn: true,
                        registry: server
                    }),
                    {
                        stdInPipe: stream.Readable.from(secret),
                    }
                );
                ext.outputChannel.info('Login succeeded.');
            } catch (err) {
                const error = parseError(err);

                if (/error storing credentials.*The stub received bad data/i.test(error.message)) {
                    // Temporary work-around for this error- same as Azure CLI
                    // See https://github.com/Azure/azure-cli/issues/4843
                    context.errorHandling.suppressReportIssue = true;
                    throw new Error(vscode.l10n.t('In order to log in to the Docker CLI using tokens, you currently need to go to your Docker config file and remove `"credsStore": "wincred"`, then try again. \nDoing this will disable wincred and cause Docker to store credentials directly in the .docker/config.json file. All registries that are currently logged in will be logged out.'));
                } else {
                    throw err;
                }
            }
        });
    }

    ext.outputChannel.show();
}
