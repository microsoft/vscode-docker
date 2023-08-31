/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, UserCancelledError, contextValueExperience } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../../extensionVariables';
import { AzureRegistry, AzureSubscriptionRegistryItem, isAzureRegistry, isAzureSubscriptionRegistryItem } from '../../../tree/registries/Azure/AzureRegistryDataProvider';
import { UnifiedRegistryItem } from '../../../tree/registries/UnifiedRegistryTreeDataProvider';

export async function openInAzurePortal(context: IActionContext, node?: UnifiedRegistryItem<AzureRegistry | AzureSubscriptionRegistryItem>): Promise<void> {
    if (!node) {
        node = await contextValueExperience(context, ext.registriesTree, { include: ['azuresubscription', 'azureContainerRegistry'] });
    }

    const azureRegistryItem = node.wrappedItem;
    const baseUrl = `${azureRegistryItem.subscription.environment.portalUrl}/#@${azureRegistryItem.subscription.tenantId}/resource`;
    let url: string;

    if (isAzureSubscriptionRegistryItem(azureRegistryItem)) {
        url = `${baseUrl}/subscriptions/${azureRegistryItem.subscription.subscriptionId}`;
    } else if (isAzureRegistry(azureRegistryItem)) {
        url = `${baseUrl}/${azureRegistryItem.id}`;
    } else {
        throw new UserCancelledError();
    }

    await vscode.env.openExternal(vscode.Uri.parse(url));
}
