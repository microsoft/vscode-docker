/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { ContainerRegistryManagementClient } from '@azure/arm-containerregistry';
import { AzureSubscription } from '@microsoft/vscode-azext-azureauth';
import { l10n } from 'vscode';

function parseResourceId(id: string): RegExpMatchArray {
    const matches: RegExpMatchArray | null = id.match(/\/subscriptions\/(.*)\/resourceGroups\/(.*)\/providers\/(.*)\/(.*)/i);
    if (matches === null || matches.length < 3) {
        throw new Error(l10n.t('Invalid Azure Resource Id'));
    }
    return matches;
}

export function getResourceGroupFromId(id: string): string {
    return parseResourceId(id)[2];
}

export async function createAzureContainerRegistryClient(subscriptionItem: AzureSubscription): Promise<ContainerRegistryManagementClient> {
    return new (await import('@azure/arm-containerregistry')).ContainerRegistryManagementClient(subscriptionItem.credential, subscriptionItem.subscriptionId);
}
