/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Container } from 'dockerode';
import vscode = require('vscode');
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';
import { callDockerodeWithErrorHandling } from '../../utils/callDockerodeWithErrorHandling';

export async function stopContainer(context: IActionContext, node: ContainerTreeItem | undefined, selectedNodes: ContainerTreeItem[] | undefined): Promise<void> {
    let nodes: ContainerTreeItem[];
    if (selectedNodes) {
        nodes = selectedNodes;
    } else if (node) {
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
            const container: Container = n.getContainer();
            // eslint-disable-next-line @typescript-eslint/promise-function-async
            await callDockerodeWithErrorHandling(() => container.stop(), context);

        }));
    });
}
