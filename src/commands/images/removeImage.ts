/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { IActionContext, UserCancelledError } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { ImageTreeItem } from '../../tree/images/ImageTreeItem';

export async function removeImage(context: IActionContext, node: ImageTreeItem | undefined): Promise<void> {
    let nodes: ImageTreeItem[] = [];
    if (node) {
        nodes = [node];
    } else {
        nodes = await ext.imagesTree.showTreeItemPicker(ImageTreeItem.contextValue, { ...context, canPickMany: true, suppressCreatePick: true });
    }

    let confirmRemove: string;
    if (nodes.length === 0) {
        throw new UserCancelledError();
    } else if (nodes.length === 1) {
        node = nodes[0];
        confirmRemove = `Are you sure you want to remove image "${node.label}"? This will remove all matching and child images.`;
    } else {
        confirmRemove = "Are you sure you want to remove selected images? This will remove all matching and child images.";
    }

    // no need to check result - cancel will throw a UserCancelledError
    await ext.ui.showWarningMessage(confirmRemove, { modal: true }, { title: 'Remove' });

    let removing: string = "Removing image(s)...";
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: removing }, async () => {
        await Promise.all(nodes.map(async n => await n.deleteTreeItem(context)));
    });
}
