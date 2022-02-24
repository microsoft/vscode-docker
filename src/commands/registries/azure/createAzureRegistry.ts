/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../../../extensionVariables';
import type { SubscriptionTreeItem } from '../../../tree/registries/azure/SubscriptionTreeItem'; // These are only dev-time imports so don't need to be lazy
import { getAzSubTreeItem } from '../../../utils/lazyPackages';

export async function createAzureRegistry(context: IActionContext, node?: SubscriptionTreeItem): Promise<void> {
    const azSubTreeItem = await getAzSubTreeItem();

    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<SubscriptionTreeItem>(azSubTreeItem.SubscriptionTreeItem.contextValue, context);
    }

    await node.createChild(context);
}
