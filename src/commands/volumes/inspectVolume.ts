/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, openReadOnlyJson } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { VolumeTreeItem } from "../../tree/volumes/VolumeTreeItem";

export async function inspectVolume(context: IActionContext, node?: VolumeTreeItem): Promise<void> {
    if (!node) {
        node = await ext.volumesTree.showTreeItemPicker<VolumeTreeItem>(VolumeTreeItem.contextValue, { ...context, noItemFoundErrorMessage: 'No volumes are available to inspect' });
    }

    const inspectInfo = await node.getVolume().inspect();
    await openReadOnlyJson(node, inspectInfo);
}
