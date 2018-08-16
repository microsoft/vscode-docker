/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as Keytar from 'keytar';
import * as vscode from 'vscode';
import { DialogResponses } from 'vscode-azureextensionui';

import { callWithTelemetryAndErrorHandling, IActionContext, IAzureNode, parseError } from 'vscode-azureextensionui';
import { keytarConstants, MAX_CONCURRENT_REQUESTS } from '../../constants'
import { ext } from '../../extensionVariables';
import { getCoreNodeModule, getKeytarModule } from '../utils/utils';
import { CustomRegistryNode } from './customRegistryNodes';

const keytar: typeof Keytar = getCoreNodeModule('keytar');

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
    console.warn("10");
    let registries = await getCustomRegistries();
    console.warn("11");
    // tslint:disable-next-line:no-constant-condition
    let url = await ext.ui.showInputBox({
        prompt: "Enter the URL for the registry",
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
    console.warn("12");
    let userName = await ext.ui.showInputBox({
        prompt: "Enter the username for connecting, or ENTER for none"
    });
    console.warn("13");
    let password: string;
    if (userName) {
        console.warn("14");
        password = await ext.ui.showInputBox({
            prompt: "Enter the password",
            password: true
        });
    }
    console.warn("15");
    let newRegistry: CustomRegistry = {
        url,
        credentials: { userName, password }
    };

    console.warn("16");
    let invalidMessage = await CustomRegistryNode.isValidRegistryUrl(newRegistry);
    if (invalidMessage) {
        throw new Error(invalidMessage);
    }

    // Save
    console.warn("17");
    let sensitive: string = JSON.stringify(newRegistry.credentials);
    let key = getUsernamePwdKey(newRegistry.url);
    await keytar.setPassword(keytarConstants.serviceId, key, sensitive);
    registries.push(newRegistry);
    await saveCustomRegistriesNonsensitive(registries);
    console.warn("18");
    await refresh();
    console.warn("19");
}

export async function disconnectCustomRegistry(node: CustomRegistryNode): Promise<void> {
    let registries = await getCustomRegistries();
    let registry = registries.find(reg => reg.url.toLowerCase() === node.registry.url.toLowerCase());

    if (registry) {
        let response = await ext.ui.showWarningMessage(`Disconnect from container registry at "${registry.url}"?`, DialogResponses.yes, DialogResponses.no);
        if (response === DialogResponses.yes) {
            let key = getUsernamePwdKey(node.registry.url);
            await keytar.deletePassword(keytarConstants.serviceId, key);
            registries.splice(registries.indexOf(registry), 1);
            await saveCustomRegistriesNonsensitive(registries);
            await refresh();
        }
    }
}

function getUsernamePwdKey(registryUrl: string): string {
    return `usernamepwd_${registryUrl}`;
}

export async function getCustomRegistries(): Promise<CustomRegistry[]> {
    let nonsensitive = ext.context.workspaceState.get<CustomRegistryNonsensitive[]>(customRegistriesKey) || [];
    let registries: CustomRegistry[] = [];

    for (let reg of nonsensitive) {
        await callWithTelemetryAndErrorHandling('getCustomRegistryUsernamePwd', async function (this: IActionContext): Promise<void> {
            this.suppressTelemetry = true;

            try {
                let key = getUsernamePwdKey(reg.url);
                let credentialsString = await keytar.getPassword(keytarConstants.serviceId, key);
                let credentials: CustomRegistryCredentials = JSON.parse(credentialsString);
                registries.push({
                    url: reg.url,
                    credentials
                });
                registries.push()
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
    await ext.context.workspaceState.update(customRegistriesKey, minimal);
}
