/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, openInPortal } from 'vscode-azureextensionui';
import { ext } from '../../../extensionVariables';
import { AzureRegistryTreeItem } from '../../../tree/registries/azure/AzureRegistryTreeItem';
import { AzureRepositoryTreeItem } from '../../../tree/registries/azure/AzureRepositoryTreeItem';
import { SubscriptionTreeItem } from '../../../tree/registries/azure/SubscriptionTreeItem';
import { registryExpectedContextValues } from '../../../tree/registries/registryContextValues';

export async function openInAzurePortal(context: IActionContext, node?: SubscriptionTreeItem | AzureRegistryTreeItem | AzureRepositoryTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<AzureRegistryTreeItem>(registryExpectedContextValues.azure.registry, context);
    }

    if (node instanceof SubscriptionTreeItem) {
        await openInPortal(node.subscription, node.subscription.subscriptionId);
    } else if (node instanceof AzureRegistryTreeItem) {
        await openInPortal(node.parent.subscription, node.registryId);
    } else {
        await openInPortal(node.parent.parent.subscription, `${node.parent.registryId}/repository`);
    }
}
