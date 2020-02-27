/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { IActionContext } from 'vscode-azureextensionui';
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
        confirmRemove = localize('vscode-docker.commands.images.remove.confirmSingle', 'Are you sure you want to remove image "{0}"? This will remove all matching and child images.', nodes[0].label);
    } else {
        confirmRemove = localize('vscode-docker.commands.images.remove.confirmMulti', 'Are you sure you want to remove selected images? This will remove all matching and child images.');
    }

    // no need to check result - cancel will throw a UserCancelledError
    await ext.ui.showWarningMessage(confirmRemove, { modal: true }, { title: 'Remove' });

    let removing: string = localize('vscode-docker.commands.images.remove.removing', 'Removing image(s)...');
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: removing }, async () => {
        await Promise.all(nodes.map(async n => await n.deleteTreeItem(context)));
    });
}
