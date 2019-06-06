/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { ImageTreeItem } from "../../tree/images/ImageTreeItem";
import { fsUtils } from "../../utils/fsUtils";

export async function inspectImage(context: IActionContext, node?: ImageTreeItem): Promise<void> {
    if (!node) {
        node = await ext.imagesTree.showTreeItemPicker<ImageTreeItem>(ImageTreeItem.contextValue, context);
    }

    const inspectInfo = await ext.dockerode.getImage(node.image.Id).inspect();
    await fsUtils.openJsonInEditor(inspectInfo);
}
