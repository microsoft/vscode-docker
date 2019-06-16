/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { VolumeTreeItem } from "../../tree/volumes/VolumeTreeItem";
import { fsUtils } from "../../utils/fsUtils";

export async function inspectVolume(context: IActionContext, node?: VolumeTreeItem): Promise<void> {
    if (!node) {
        node = await ext.volumesTree.showTreeItemPicker<VolumeTreeItem>(VolumeTreeItem.contextValue, context);
    }

    const inspectInfo = await ext.dockerode.getVolume(node.volume.Name).inspect();
    await fsUtils.openJsonInEditor(inspectInfo);
}
