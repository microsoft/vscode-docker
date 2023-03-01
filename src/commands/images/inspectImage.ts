/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, openReadOnlyJson } from "@microsoft/vscode-azext-utils";
import { l10n } from 'vscode';
import { ext } from "../../extensionVariables";
import { ImageTreeItem } from "../../tree/images/ImageTreeItem";

export async function inspectImage(context: IActionContext, node?: ImageTreeItem): Promise<void> {
    if (!node) {
        await ext.imagesTree.refresh(context);
        node = await ext.imagesTree.showTreeItemPicker<ImageTreeItem>(ImageTreeItem.contextValue, {
            ...context,
            noItemFoundErrorMessage: l10n.t('No images are available to inspect')
        });
    }

    const inspectResult = await ext.runWithDefaults(client =>
        client.inspectImages({ imageRefs: [node.imageId] })
    );
    await openReadOnlyJson(node, JSON.parse(inspectResult[0].raw));
}
