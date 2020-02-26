/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { VolumeTreeItem } from '../../tree/volumes/VolumeTreeItem';
import { multiSelectNodes } from '../../utils/multiSelectNodes';

export async function removeVolume(context: IActionContext, node?: VolumeTreeItem, nodes?: VolumeTreeItem[]): Promise<void> {
    nodes = await multiSelectNodes(
        { ...context, suppressCreatePick: true, noItemFoundErrorMessage: 'No volumes are available to remove' },
        ext.volumesTree,
        VolumeTreeItem.contextValue,
        node,
        nodes
    );

    let confirmRemove: string;
    if (nodes.length === 1) {
        confirmRemove = `Are you sure you want to remove volume "${nodes[0].label}"?`;
    } else {
        confirmRemove = "Are you sure you want to remove selected volumes?";
    }

    // no need to check result - cancel will throw a UserCancelledError
    await ext.ui.showWarningMessage(confirmRemove, { modal: true }, { title: 'Remove' });

    let removing: string = "Removing volume(s)...";
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: removing }, async () => {
        await Promise.all(nodes.map(async n => await n.deleteTreeItem(context)));
    });
}
