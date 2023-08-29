/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { contextValueExperience, IActionContext, nonNullProp, UserCancelledError } from '@microsoft/vscode-azext-utils';
import { parseDockerLikeImageName } from '@microsoft/vscode-container-client';
import { CommonRegistry, CommonTag, isDockerHubRegistry, LoginInformation } from '@microsoft/vscode-docker-registries';
import * as semver from 'semver';
import * as vscode from 'vscode';
import { ext } from '../../../extensionVariables';
import { isAzureRegistryItem } from '../../../tree/registries/Azure/AzureRegistryDataProvider';
import { getFullImageNameFromRegistryTagItem } from '../../../tree/registries/registryTreeUtils';
import { UnifiedRegistryItem } from '../../../tree/registries/UnifiedRegistryTreeDataProvider';
import { installExtension } from '../../../utils/installExtension';
import { addImageTaggingTelemetry } from '../../images/tagImage';

const acaExtensionId = 'ms-azuretools.vscode-azurecontainerapps';
const minimumAcaExtensionVersion = '0.4.0';

// The interface of the command options passed to the Azure Container Apps extension's deployImageToAca command
interface DeployImageToAcaOptionsContract {
    image: string;
    registryName: string;
    username?: string;
    secret?: string;
}

export async function deployImageToAca(context: IActionContext, node?: UnifiedRegistryItem<CommonTag>): Promise<void> {
    // Assert installation of the ACA extension
    if (!isAcaExtensionInstalled()) {
        // This will always throw a `UserCancelledError` but with the appropriate step name
        // based on user choice about installation
        await openAcaInstallPage(context);
    }

    if (!node) {
        node = await contextValueExperience(context, ext.registriesTree, { include: 'commontag' });
    }

    const commandOptions: Partial<DeployImageToAcaOptionsContract> = {
        image: getFullImageNameFromRegistryTagItem(node.wrappedItem),
    };

    addImageTaggingTelemetry(context, commandOptions.image, '');

    const registry: UnifiedRegistryItem<CommonRegistry> = node.parent.parent as unknown as UnifiedRegistryItem<CommonRegistry>;

    if (isAzureRegistryItem(registry.wrappedItem)) {
        // No additional work to do; ACA can handle this on its own
    } else {
        const logInInfo: LoginInformation = await registry.provider.getLoginInformation(registry.wrappedItem);

        if (!logInInfo?.username || !logInInfo?.secret) {
            throw new Error(vscode.l10n.t('No credentials found for registry "{0}".', registry.wrappedItem.label));
        }

        if (isDockerHubRegistry(registry.wrappedItem)) {
            // Ensure Docker Hub images are prefixed with 'docker.io/...'
            if (!/^docker\.io\//i.test(commandOptions.image)) {
                commandOptions.image = 'docker.io/' + commandOptions.image;
            }
        }

        commandOptions.username = logInInfo.username;
        commandOptions.secret = logInInfo.secret;
    }

    commandOptions.registryName = nonNullProp(parseDockerLikeImageName(commandOptions.image), 'registry');

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
    const message = vscode.l10n.t(
        'Version {0} or higher of the Azure Container Apps extension is required to deploy to Azure Container Apps. Would you like to install it now?',
        minimumAcaExtensionVersion
    );

    await installExtension(context, acaExtensionId, message);

    throw new UserCancelledError('installAcaExtensionAccepted');
}
