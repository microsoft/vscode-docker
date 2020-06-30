/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Container } from 'dockerode';
import vscode = require('vscode');
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';
import { callDockerodeWithErrorHandling } from '../../utils/callDockerode';
import { multiSelectNodes } from '../../utils/multiSelectNodes';

export async function stopContainer(context: IActionContext, node?: ContainerTreeItem, nodes?: ContainerTreeItem[]): Promise<void> {
    nodes = await multiSelectNodes(
        { ...context, noItemFoundErrorMessage: localize('vscode-docker.commands.containers.stop.noContainers', 'No containers are available to stop') },
        ext.containersTree,
        /^(paused|restarting|running)Container$/i,
        node,
        nodes
    );

    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: localize('vscode-docker.commands.containers.stop.stopping', 'Stopping Container(s)...') }, async () => {
        await Promise.all(nodes.map(async n => {
            const container: Container = await n.getContainer();
            await callDockerodeWithErrorHandling(async () => container.stop(), context);
        }));
    });
}
