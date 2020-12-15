/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ImageTreeItem } from '../../tree/images/ImageTreeItem';

export async function copyFullTag(context: IActionContext, node: ImageTreeItem | undefined): Promise<string> {
    if (!node) {
        await ext.imagesTree.refresh(context);
        node = await ext.imagesTree.showTreeItemPicker<ImageTreeItem>(ImageTreeItem.contextValue, {
            ...context,
            noItemFoundErrorMessage: localize('vscode-docker.commands.images.copyFullTag.noImages', 'No images are available to copy tag')
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    vscode.env.clipboard.writeText(node.fullTag);
    return node.fullTag;
}
