/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { IActionContext, UserCancelledError } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { NetworkTreeItem } from '../../tree/networks/NetworkTreeItem';

export async function removeNetwork(context: IActionContext, node: NetworkTreeItem | undefined): Promise<void> {
    let nodes: NetworkTreeItem[] = [];
    if (node) {
        nodes = [node];
    } else {
        nodes = await ext.networksTree.showTreeItemPicker(NetworkTreeItem.contextValue, { ...context, canPickMany: true, suppressCreatePick: true });
    }

    if (nodes.some(node => ['bridge', 'host', 'none'].includes(node.networkName))) {
        ext.ui.showWarningMessage("It's not possible to remove the built-in networks 'bridge', 'host', or 'none'");
        nodes = nodes.filter((node) => !['bridge', 'host', 'none'].includes(node.networkName));
    };

    let confirmRemove: string;
    if (nodes.length === 0) {
        throw new UserCancelledError();
    } else if (nodes.length === 1) {
        node = nodes[0];
        confirmRemove = `Are you sure you want to remove network "${node.label}"?`;
    } else {
        confirmRemove = "Are you sure you want to remove selected networks?";
    }

    // no need to check result - cancel will throw a UserCancelledError
    await ext.ui.showWarningMessage(confirmRemove, { modal: true }, { title: 'Remove' });

    let removing: string = "Removing network(s)...";
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: removing }, async () => {
        await Promise.all(nodes.map(async n => await n.deleteTreeItem(context)));
    });
}
