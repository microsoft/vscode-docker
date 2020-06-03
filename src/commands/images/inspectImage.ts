/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Image, ImageInspectInfo } from "dockerode";
import { IActionContext, openReadOnlyJson } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { ImageTreeItem } from "../../tree/images/ImageTreeItem";
import { callDockerodeWithErrorHandling } from "../../utils/callDockerode";

export async function inspectImage(context: IActionContext, node?: ImageTreeItem): Promise<void> {
    if (!node) {
        await ext.imagesTree.refresh();
        node = await ext.imagesTree.showTreeItemPicker<ImageTreeItem>(ImageTreeItem.contextValue, {
            ...context,
            noItemFoundErrorMessage: localize('vscode-docker.commands.images.inspect.noImages', 'No images are available to inspect')
        });
    }

    const image: Image = await node.getImage();
    const inspectInfo: ImageInspectInfo = await callDockerodeWithErrorHandling(async () => image.inspect(), context);
    await openReadOnlyJson(node, inspectInfo);
}
