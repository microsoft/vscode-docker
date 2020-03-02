/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Image, ImageInspectInfo } from "dockerode";
import { IActionContext, openReadOnlyJson } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { ImageTreeItem } from "../../tree/images/ImageTreeItem";
import { callDockerodeWithErrorHandling } from "../../utils/callDockerodeWithErrorHandling";

export async function inspectImage(context: IActionContext, node?: ImageTreeItem): Promise<void> {
    if (!node) {
        node = await ext.imagesTree.showTreeItemPicker<ImageTreeItem>(ImageTreeItem.contextValue, {
            ...context,
            noItemFoundErrorMessage: localize('vscode-docker.commands.images.inspect.noImages', 'No images are available to inspect')
        });
    }

    const image: Image = node.getImage();
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    const inspectInfo: ImageInspectInfo = await callDockerodeWithErrorHandling(() => image.inspect(), context);
    await openReadOnlyJson(node, inspectInfo);
}
