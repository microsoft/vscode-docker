/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { IActionContext } from 'vscode-azureextensionui';
import { builtInNetworks } from '../../constants';
import { ext } from '../../extensionVariables';
import { NetworkTreeItem } from '../../tree/networks/NetworkTreeItem';
import { multiSelectNodes } from '../../utils/multiSelectNodes';

export async function removeNetwork(context: IActionContext, node?: NetworkTreeItem, nodes?: NetworkTreeItem[]): Promise<void> {
    nodes = await multiSelectNodes(
        { ...context, suppressCreatePick: true, noItemFoundErrorMessage: 'No networks are available to remove' },
        ext.networksTree,
        NetworkTreeItem.customNetworkRegExp,
        node,
        nodes
    );
    if (nodes.some(n => builtInNetworks.includes(n.networkName))) {
        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        ext.ui.showWarningMessage('The built-in networks \'bridge\', \'host\', and \'none\' cannot be removed.');
        nodes = nodes.filter(n => !builtInNetworks.includes(n.networkName));
    }
    let confirmRemove: string;
    if (nodes.length === 1) {
        confirmRemove = `Are you sure you want to remove network "${nodes[0].label}"?`;
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
