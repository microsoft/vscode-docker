/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

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

// The interface of the command options passed to the Azure Container Apps extension's deployImageToAca command
interface DeployImageToAcaOptionsContract {
    imageName: string;
    username?: string;
    secret?: string;
}

export async function deployImageToAca(context: IActionContext, node?: RemoteTagTreeItem): Promise<void> {
    // Assert installation of the ACA extension
    if (!isAcaExtensionInstalled()) {
        await openAcaInstallPageAndWait(context);
    }

    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<RemoteTagTreeItem>([registryExpectedContextValues.dockerHub.tag, registryExpectedContextValues.dockerV2.tag], context);
    }

    const commandOptions: DeployImageToAcaOptionsContract = {
        imageName: node.fullTag,
    };

    addImageTaggingTelemetry(context, commandOptions.imageName, '');

    const registry: RegistryTreeItemBase = node.parent.parent;
    if (registry instanceof AzureRegistryTreeItem) {
        // No additional work to do; ACA can handle this on its own
    } else if (registry instanceof DockerHubNamespaceTreeItem || registry instanceof DockerV2RegistryTreeItemBase) {
        const { auth } = await registry.getDockerCliCredentials() as { auth?: { username?: string, password?: string } };

        if (!auth?.username || !auth?.password) {
            throw new Error(localize('vscode-docker.commands.registries.azure.deployImageToAca.noCredentials', 'No credentials found for registry "{0}".', registry.label));
        }

        commandOptions.username = auth.username;
        commandOptions.secret = auth.password;
    } else {
        context.errorHandling.suppressReportIssue = true;
        throw new Error(localize('vscode-docker.commands.registries.azure.deployImageToAca.unsupportedRegistry', 'Unsupported registry type'));
    }

    // Don't wait
    void vscode.commands.executeCommand('containerApps.deployImageApi', commandOptions);
}

function isAcaExtensionInstalled(): boolean {
    const acaExtension = vscode.extensions.getExtension(acaExtensionId);
    return !!acaExtension;
}

async function openAcaInstallPageAndWait(context: IActionContext): Promise<void> {
    const message = localize('vscode-docker.commands.registries.azure.deployImageToAca.installAcaExtension', 'The Azure Container Apps extension is required to deploy to Azure Container Apps. Would you like to install it now?');
    const installButton: vscode.MessageItem = {
        title: localize('vscode-docker.commands.registries.azure.deployImageToAca.install', 'Install'),
    };
    const response = await context.ui.showWarningMessage(message, { modal: true }, installButton, DialogResponses.cancel);

    if (response !== installButton) {
        throw new UserCancelledError('installAcaExtensionDeclined');
    }

    await vscode.commands.executeCommand('extension.open', acaExtensionId);

    return new Promise((resolve) => {
        const subscription = vscode.extensions.onDidChange(() => {
            if (isAcaExtensionInstalled()) {
                subscription.dispose();
                resolve();
            }
        });
    });
}
