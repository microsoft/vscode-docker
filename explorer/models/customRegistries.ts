import * as Keytar from 'keytar';
import * as path from 'path';
import * as request from 'request-promise';
import * as vscode from 'vscode';
import { DialogResponses } from 'vscode-azureextensionui';

import * as ContainerModels from 'azure-arm-containerregistry/lib/models';
import { ResourceManagementClient, SubscriptionClient, SubscriptionModels } from 'azure-arm-resource';
import { CredentialDetails } from 'crypto';
import { callWithTelemetryAndErrorHandling, IActionContext, IAzureNode, parseError } from 'vscode-azureextensionui';
import { keytarConstants, MAX_CONCURRENT_REQUESTS } from '../../constants'
import { ext } from '../../extensionVariables';
import { AsyncPool } from '../../utils/asyncpool';
import { getCoreNodeModule, getKeytarModule } from '../utils/utils';
import { CustomRegistryNode } from './customRegistryNodes';
import { NodeBase } from './nodeBase';
import { RegistryType } from './registryType';

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
    let registries = await getCustomRegistries();

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

    let invalidMessage = await CustomRegistryNode.isValidRegistryUrl(newRegistry);
    if (invalidMessage) {
        throw new Error(invalidMessage);
    }

    // Save
    let sensitive: string = JSON.stringify(newRegistry.credentials);
    let key = getUsernamePwdKey(newRegistry.url);
    await keytar.setPassword(keytarConstants.serviceId, key, sensitive);
    registries.push(newRegistry);
    await saveCustomRegistriesNonsensitive(registries);

    await refresh();
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
