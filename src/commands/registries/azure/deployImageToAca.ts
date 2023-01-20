/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as semver from 'semver';
import * as vscode from 'vscode';
import { DialogResponses, IActionContext, UserCancelledError } from '@microsoft/vscode-azext-utils';
import { RemoteTagTreeItem } from '../../../tree/registries/RemoteTagTreeItem';
import { localize } from '../../../localize';
import { ext } from '../../../extensionVariables';
import { registryExpectedContextValues } from '../../../tree/registries/registryContextValues';
import { RegistryTreeItemBase } from '../../../tree/registries/RegistryTreeItemBase';
import { AzureRegistryTreeItem } from '../../../tree/registries/azure/AzureRegistryTreeItem';
import { DockerHubNamespaceTreeItem } from '../../../tree/registries/dockerHub/DockerHubNamespaceTreeItem';
import { DockerV2RegistryTreeItemBase } from '../../../tree/registries/dockerV2/DockerV2RegistryTreeItemBase';
import { addImageTaggingTelemetry } from '../../images/tagImage';

const acaExtensionId = 'ms-azuretools.vscode-azurecontainerapps';
const minimumAcaExtensionVersion = '0.4.0'; // TODO: get the exact minimum version that is needed

// The interface of the command options passed to the Azure Container Apps extension's deployImageToAca command
interface DeployImageToAcaOptionsContract {
    image: string;
    loginServer?: string;
    username?: string;
    secret?: string;
}

export async function deployImageToAca(context: IActionContext, node?: RemoteTagTreeItem): Promise<void> {
    // Assert installation of the ACA extension
    if (!isAcaExtensionInstalled()) {
        // This will always throw a `UserCancelledError` but with the appropriate step name
        // based on user choice about installation
        await openAcaInstallPage(context);
    }

    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<RemoteTagTreeItem>([registryExpectedContextValues.dockerHub.tag, registryExpectedContextValues.dockerV2.tag], context);
    }

    const commandOptions: DeployImageToAcaOptionsContract = {
        image: node.fullTag,
    };

    addImageTaggingTelemetry(context, commandOptions.image, '');

    const registry: RegistryTreeItemBase = node.parent.parent;
    if (registry instanceof AzureRegistryTreeItem) {
        // No additional work to do; ACA can handle this on its own
    } else {
        const { auth, registryPath } = await registry.getDockerCliCredentials() as { auth?: { username?: string, password?: string }, registryPath: string };

        if (!auth?.username || !auth?.password || !registryPath) {
            throw new Error(localize('vscode-docker.commands.registries.azure.deployImageToAca.noCredentials', 'No credentials found for registry "{0}".', registry.label));
        }

        if (registry instanceof DockerHubNamespaceTreeItem || registry instanceof DockerV2RegistryTreeItemBase) {
            // ACA preference for Docker Hub images to be prefixed with 'docker.io/...'
            if (!/^docker.io\//.test(commandOptions.image)) {
                commandOptions.image = 'docker.io/' + commandOptions.image;
            }
        }

        commandOptions.loginServer = registryPath;
        commandOptions.username = auth.username;
        commandOptions.secret = auth.password;
    }

    // Don't wait
    void vscode.commands.executeCommand('containerApps.deployImageApi', commandOptions);
}

function isAcaExtensionInstalled(): boolean {
    const acaExtension = vscode.extensions.getExtension(acaExtensionId);

    if (!acaExtension?.packageJSON?.version) {
        // If the ACA extension is not present, or the package JSON didn't come through, or the version is not present, then it's not installed
        return false;
    }

    const acaVersion = semver.coerce(acaExtension.packageJSON.version);
    const minVersion = semver.coerce(minimumAcaExtensionVersion);

    return semver.gte(acaVersion, minVersion);
}

async function openAcaInstallPage(context: IActionContext): Promise<void> {
    const message = localize(
        'vscode-docker.commands.registries.azure.deployImageToAca.installAcaExtension',
        'Version {0} or higher of the Azure Container Apps extension is required to deploy to Azure Container Apps. Would you like to install it now?',
        minimumAcaExtensionVersion
    );

    const installButton: vscode.MessageItem = {
        title: localize('vscode-docker.commands.registries.azure.deployImageToAca.install', 'Install'),
    };

    const response = await context.ui.showWarningMessage(message, { modal: true }, installButton, DialogResponses.cancel);

    if (response !== installButton) {
        throw new UserCancelledError('installAcaExtensionDeclined');
    }

    await vscode.commands.executeCommand('extension.open', acaExtensionId);

    throw new UserCancelledError('installAcaExtensionOpened');
}
