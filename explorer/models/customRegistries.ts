/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// tslint:disable-next-line:no-var-requires
let www_authenticate = require('www-authenticate');
import * as vscode from 'vscode';
import { callWithTelemetryAndErrorHandling, IActionContext, parseError } from 'vscode-azureextensionui';
import { keytarConstants } from '../../constants'
import { ext } from '../../extensionVariables';
import { nonNullValue } from '../../utils/nonNull';
import { CustomRegistryNode } from './customRegistryNodes';

let previousUrl: string = '';
let previousUserName: string;
let previousPassword: string;

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

    let url: string;
    // tslint:disable-next-line:no-constant-condition
    url = await ext.ui.showInputBox({
        value: previousUrl,
        prompt: "Enter the registry server",
        validateInput: async (value: string): Promise<string | undefined> => {
            try {
                let uri = vscode.Uri.parse(prependHttps(value));
                if (!uri.scheme || !uri.authority || !uri.path) {
                    return "Please enter a valid URL";
                }
            } catch (error) {
                return "Please enter a valid URL";
            }

            if (registries.find(reg => reg.url.toLowerCase() === value.toLowerCase())) {
                return `There is already an entry for a container registry at ${value}`;
            }

            return undefined;
        }
    });

    url = prependHttps(url);
    if (previousUrl !== url) {
        previousUrl = url;
        previousUserName = '';
        previousPassword = '';
    }

    let userName = await ext.ui.showInputBox({
        value: previousUserName,
        prompt: "Enter the username, or ENTER for none"
    });

    previousUserName = userName;

    let password: string = '';
    if (userName) {
        password = await ext.ui.showInputBox({
            value: previousPassword,
            prompt: "Enter the password",
            password: true
        });
    }

    previousPassword = password;

    let newRegistry: CustomRegistry = {
        url,
        credentials: { userName, password }
    };

    await CustomRegistryNode.verifyCanAccessRegistry(newRegistry);

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

function prependHttps(url: string): string {
    url = url.trim();
    if (!url.match(/\w+:\/\//)) {
        url = `https://${url}`;
    }

    return url;
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
                    let credentials = <CustomRegistryCredentials>JSON.parse(nonNullValue(credentialsString, 'Invalid stored password'));
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
