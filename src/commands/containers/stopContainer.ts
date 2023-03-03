/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';
import { multiSelectNodes } from '../../utils/multiSelectNodes';

export async function stopContainer(context: IActionContext, node?: ContainerTreeItem, nodes?: ContainerTreeItem[]): Promise<void> {
    nodes = await multiSelectNodes(
        { ...context, noItemFoundErrorMessage: vscode.l10n.t('No containers are available to stop') },
        ext.containersTree,
        /^(paused|restarting|running)Container$/i,
        node,
        nodes
    );

    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: vscode.l10n.t('Stopping Container(s)...') }, async () => {
        await ext.runWithDefaults(client =>
            client.stopContainers({ container: nodes.map(n => n.containerId) })
        );
    });
}
