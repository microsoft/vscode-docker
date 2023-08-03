/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { UnifiedRegistryItem } from '../../../tree/registries/UnifiedRegistryTreeDataProvider';

export async function openInAzurePortal(context: IActionContext, node?: UnifiedRegistryItem<unknown>): Promise<void> {
    // if (!node) {
    //     node = await ext.registriesTree.showTreeItemPicker<AzureRegistryTreeItem>(registryExpectedContextValues.azure.registry, context);
    // }

    // const azSubTreeItem = await getAzSubTreeItem();
    // const azExtAzureUtils = await getAzExtAzureUtils();

    // if (node instanceof azSubTreeItem.SubscriptionTreeItem) {
    //     await azExtAzureUtils.openInPortal(node.subscription, node.subscription.subscriptionId);
    // } else if (node instanceof AzureRegistryTreeItem) {
    //     await azExtAzureUtils.openInPortal(node.parent.subscription, node.registryId);
    // } else {
    //     await azExtAzureUtils.openInPortal(node.parent.parent.subscription, `${node.parent.registryId}/repository`);
    // }

    // TODO: review this later
}
