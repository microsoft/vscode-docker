/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, openReadOnlyJson } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { ContainerTreeItem } from "../../tree/containers/ContainerTreeItem";

export async function inspectContainer(context: IActionContext, node?: ContainerTreeItem): Promise<void> {
    if (!node) {
        node = await ext.containersTree.showTreeItemPicker<ContainerTreeItem>(ContainerTreeItem.allContextRegExp, {
            ...context,
            noItemFoundErrorMessage: 'No containers are available to inspect'
        });
    }

    const inspectInfo = await node.getContainer().inspect();
    await openReadOnlyJson(node, inspectInfo);
}
