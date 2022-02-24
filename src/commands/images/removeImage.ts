/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ImageTreeItem } from '../../tree/images/ImageTreeItem';
import { multiSelectNodes } from '../../utils/multiSelectNodes';

export async function removeImage(context: IActionContext, node?: ImageTreeItem, nodes?: ImageTreeItem[]): Promise<void> {
    nodes = await multiSelectNodes(
        { ...context, suppressCreatePick: true, noItemFoundErrorMessage: localize('vscode-docker.commands.images.remove.noImages', 'No images are available to remove') },
        ext.imagesTree,
        ImageTreeItem.contextValue,
        node,
        nodes
    );

    let confirmRemove: string;
    if (nodes.length === 1) {
        confirmRemove = localize('vscode-docker.commands.images.remove.confirmSingle', 'Are you sure you want to remove image "{0}"? If there are other tags or child images for this image, only the tag will be removed.', nodes[0].fullTag);
    } else {
        confirmRemove = localize('vscode-docker.commands.images.remove.confirmMulti', 'Are you sure you want to remove the selected images? If there are other tags or child images for these images, only the tag will be removed.');
    }

    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmRemove, { modal: true }, { title: 'Remove' });

    const removing: string = localize('vscode-docker.commands.images.remove.removing', 'Removing image(s)...');
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: removing }, async () => {
        await Promise.all(nodes.map(async n => await n.deleteTreeItem(context)));
    });
}
