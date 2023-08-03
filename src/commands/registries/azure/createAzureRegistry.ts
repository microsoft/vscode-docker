/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
// import type { SubscriptionTreeItem } from '../../../tree/registries/azure/SubscriptionTreeItem'; // These are only dev-time imports so don't need to be lazy
import { UnifiedRegistryItem } from '../../../tree/registries/UnifiedRegistryTreeDataProvider';
// import { getAzSubTreeItem } from '../../../utils/lazyPackages';

export async function createAzureRegistry(context: IActionContext, node?: UnifiedRegistryItem<unknown>): Promise<void> {
    // const azSubTreeItem = await getAzSubTreeItem();

    if (!node) {
        // node = await ext.registriesTree.showTreeItemPicker<SubscriptionTreeItem>(azSubTreeItem.SubscriptionTreeItem.contextValue, context);
    }

    // await node.createChild(context);
    // TODO: review this later
}
