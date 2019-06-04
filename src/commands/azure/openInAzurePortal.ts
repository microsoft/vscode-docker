/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, openInPortal } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { AzureRegistryTreeItem } from '../../tree/azure/AzureRegistryTreeItem';
import { AzureRepositoryTreeItem } from '../../tree/azure/AzureRepositoryTreeItem';
import { SubscriptionTreeItem } from '../../tree/azure/SubscriptionTreeItem';

export async function openInAzurePortal(context: IActionContext, node?: SubscriptionTreeItem | AzureRegistryTreeItem | AzureRepositoryTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<AzureRegistryTreeItem>(AzureRegistryTreeItem.contextValue, context);
    }

    if (node instanceof SubscriptionTreeItem) {
        await openInPortal(node.root, node.root.subscriptionId);
    } else if (node instanceof AzureRegistryTreeItem) {
        await openInPortal(node.parent.root, node.registryId);
    } else {
        await openInPortal(node.parent.parent.root, `${node.parent.registryId}/repository`);
    }
}
