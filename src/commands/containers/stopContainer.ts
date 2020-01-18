/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';

export async function stopContainer(context: IActionContext, node: ContainerTreeItem | undefined): Promise<void> {
    let nodes: ContainerTreeItem[];
    if (node) {
        nodes = [node];
    } else {
        nodes = await ext.containersTree.showTreeItemPicker(/^(paused|restarting|running)Container$/i, {
            ...context,
            canPickMany: true,
            noItemFoundErrorMessage: 'No containers are availble to stop'
        });
    }

    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Stopping Container(s)..." }, async () => {
        await Promise.all(nodes.map(async n => {
            await n.getContainer().stop();
        }));
    });
}
