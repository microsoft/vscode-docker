/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../../extensionVariables';
import { PrivateRegistryTreeItem } from '../../../tree/registries/private/PrivateRegistryTreeItem';

export async function disconnectPrivateRegistry(context: IActionContext, node?: PrivateRegistryTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<PrivateRegistryTreeItem>(PrivateRegistryTreeItem.contextValue, { ...context, suppressCreatePick: true });
    }

    await node.deleteTreeItem(context);
    await node.parent.refresh();
}
