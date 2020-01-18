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

export async function startContainer(context: IActionContext, node: ContainerTreeItem | undefined): Promise<void> {
    let nodes: ContainerTreeItem[];
    if (node) {
        nodes = [node];
    } else {
        nodes = await ext.containersTree.showTreeItemPicker(/^(created|dead|exited|paused)Container$/i, {
            ...context,
            canPickMany: true,
            noItemFoundErrorMessage: 'No containers are available to start'
        });
    }

    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Starting Container(s)..." }, async () => {
        await Promise.all(nodes.map(async n => {
            const container: Container = n.getContainer();
            // eslint-disable-next-line @typescript-eslint/promise-function-async
            await callDockerodeWithErrorHandling(() => container.start(), context);
        }));
    });
}
