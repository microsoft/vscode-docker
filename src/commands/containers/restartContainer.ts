/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';

export async function restartContainer(context: IActionContext, node: ContainerTreeItem | undefined): Promise<void> {
    let nodes: ContainerTreeItem[];
    if (node) {
        nodes = [node];
    } else {
        nodes = await ext.containersTree.showTreeItemPicker(/^(created|dead|exited|paused|running)Container$/i, {
            ...context,
            canPickMany: true,
            noItemFoundErrorMessage: 'No containers are available to restart'
        });
    }

    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Restarting Container(s)..." }, async () => {
        await Promise.all(nodes.map(async n => {
            await n.getContainer().restart();
        }));
    });
}
