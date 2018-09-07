/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { DialogResponses } from 'vscode-azureextensionui';
import { callWithTelemetryAndErrorHandling, IActionContext, IAzureNode, parseError } from 'vscode-azureextensionui';
import { keytarConstants, MAX_CONCURRENT_REQUESTS } from '../../constants'
import { ext } from '../../extensionVariables';
import { CustomRegistryNode } from './customRegistryNodes';

interface CustomRegistryNonsensitive {
    url: string,
}

export interface CustomRegistryCredentials {
    userName: string;
    password: string;
}

export interface CustomRegistry extends CustomRegistryNonsensitive {
    credentials: CustomRegistryCredentials;
}

const customRegistriesKey = 'customRegistries';

export async function connectCustomRegistry(): Promise<void> {
    let registries = await getCustomRegistries();

    // tslint:disable-next-line:no-constant-condition
    let url = await ext.ui.showInputBox({
        prompt: "Enter the URL for the registry (OAuth not yet supported)",
        placeHolder: 'Example: http://localhost:5000',
        validateInput: (value: string): string | undefined => {
            let uri = vscode.Uri.parse(value);
            if (!uri.scheme || !uri.authority || !uri.path) {
                return "Please enter a valid URL";
            }

            if (registries.find(reg => reg.url.toLowerCase() === value.toLowerCase())) {
                return `There is already an entry for a container registry at ${value}`;
            }

            return undefined;
        }
    });
    let userName = await ext.ui.showInputBox({
        prompt: "Enter the username for connecting, or ENTER for none"
    });
    let password: string;
    if (userName) {
        password = await ext.ui.showInputBox({
            prompt: "Enter the password",
            password: true
        });
    }

    let newRegistry: CustomRegistry = {
        url,
        credentials: { userName, password }
    };

    try {
        await CustomRegistryNode.verifyIsValidRegistryUrl(newRegistry);
    } catch (err) {
        let error: { statusCode?: number } = err;
        let message = parseError(error).message;

        if (error.statusCode === 401) {
            message = 'OAuth support has not yet been implemented in this preview feature.  This registry does not appear to support basic authentication.';
            throw new Error(message);
        }

        throw error;
    }

    // Save
    if (ext.keytar) {
        let sensitive: string = JSON.stringify(newRegistry.credentials);
        let key = getUsernamePwdKey(newRegistry.url);
        await ext.keytar.setPassword(keytarConstants.serviceId, key, sensitive);
        registries.push(newRegistry);
        await saveCustomRegistriesNonsensitive(registries);
    }

    await refresh();
}

export async function disconnectCustomRegistry(node: CustomRegistryNode): Promise<void> {
    let registries = await getCustomRegistries();
    let registry = registries.find(reg => reg.url.toLowerCase() === node.registry.url.toLowerCase());

    if (registry) {
        let key = getUsernamePwdKey(node.registry.url);
        if (ext.keytar) {
            await ext.keytar.deletePassword(keytarConstants.serviceId, key);
        }
        registries.splice(registries.indexOf(registry), 1);
        await saveCustomRegistriesNonsensitive(registries);
        await refresh();
    }
}

function getUsernamePwdKey(registryUrl: string): string {
    return `usernamepwd_${registryUrl}`;
}

export async function getCustomRegistries(): Promise<CustomRegistry[]> {
    let nonsensitive = ext.context.globalState.get<CustomRegistryNonsensitive[]>(customRegistriesKey) || [];
    let registries: CustomRegistry[] = [];

    for (let reg of nonsensitive) {
        await callWithTelemetryAndErrorHandling('getCustomRegistryUsernamePwd', async function (this: IActionContext): Promise<void> {
            this.suppressTelemetry = true;

            try {
                if (ext.keytar) {
                    let key = getUsernamePwdKey(reg.url);
                    let credentialsString = await ext.keytar.getPassword(keytarConstants.serviceId, key);
                    let credentials: CustomRegistryCredentials = JSON.parse(credentialsString);
                    registries.push({
                        url: reg.url,
                        credentials
                    });
                }
            } catch (error) {
                throw new Error(`Unable to retrieve password for container registry ${reg.url}: ${parseError(error).message}`);
            }
        });
    }

    return registries;
}

async function refresh(): Promise<void> {
    await vscode.commands.executeCommand('vscode-docker.explorer.refresh');
}

async function saveCustomRegistriesNonsensitive(registries: CustomRegistry[]): Promise<void> {
    let minimal: CustomRegistryNonsensitive[] = registries.map(reg => <CustomRegistryNonsensitive>{ url: reg.url });
    await ext.context.globalState.update(customRegistriesKey, minimal);
}
