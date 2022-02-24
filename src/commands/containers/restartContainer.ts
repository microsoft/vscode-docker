/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';
import { multiSelectNodes } from '../../utils/multiSelectNodes';
import { confirmAllAffectedContainers } from './confirmAllAffectedContainers';

export async function restartContainer(context: IActionContext, node?: ContainerTreeItem, nodes?: ContainerTreeItem[]): Promise<void> {
    nodes = await multiSelectNodes(
        { ...context, noItemFoundErrorMessage: localize('vscode-docker.commands.containers.restart.noContainers', 'No containers are available to restart') },
        ext.containersTree,
        /^(created|dead|exited|paused|running|terminated)Container$/i,
        node,
        nodes
    );

    const references = await confirmAllAffectedContainers(context, nodes);

    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: localize('vscode-docker.commands.containers.restart.restarting', 'Restarting Container(s)...') }, async () => {
        await Promise.all(references.map(async ref => {
            await ext.dockerClient.restartContainer(context, ref);
        }));
    });
}
