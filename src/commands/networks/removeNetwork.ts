/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { NetworkTreeItem } from '../../tree/networks/NetworkTreeItem';
import { multiSelectNodes } from '../../utils/multiSelectNodes';

export async function removeNetwork(context: IActionContext, node?: NetworkTreeItem, nodes?: NetworkTreeItem[]): Promise<void> {
    nodes = await multiSelectNodes(
        { ...context, suppressCreatePick: true, noItemFoundErrorMessage: localize('vscode-docker.commands.networks.remove.noNetworks', 'No networks are available to remove') },
        ext.networksTree,
        NetworkTreeItem.customNetworkRegExp,
        node,
        nodes
    );

    let confirmRemove: string;
    if (nodes.length === 1) {
        confirmRemove = localize('vscode-docker.commands.networks.remove.confirmSingle', 'Are you sure you want to remove network "{0}"?', nodes[0].label);
    } else {
        confirmRemove = localize('vscode-docker.commands.networks.remove.confirmMulti', 'Are you sure you want to remove selected networks?');
    }

    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmRemove, { modal: true }, { title: localize('vscode-docker.commands.networks.remove.remove', 'Remove') });

    const removing: string = localize('vscode-docker.commands.networks.remove.removing', 'Removing network(s)...');
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: removing }, async () => {
        await Promise.all(nodes.map(async n => await n.deleteTreeItem(context)));
    });
}
