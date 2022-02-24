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

export async function removeContainer(context: IActionContext, node?: ContainerTreeItem, nodes?: ContainerTreeItem[]): Promise<void> {
    nodes = await multiSelectNodes(
        { ...context, noItemFoundErrorMessage: localize('vscode-docker.commands.containers.remove.noContainers', 'No containers are available to remove') },
        ext.containersTree,
        ContainerTreeItem.allContextRegExp,
        node,
        nodes
    );

    let confirmRemove: string;
    if (nodes.length === 1) {
        confirmRemove = localize('vscode-docker.commands.containers.remove.confirmSingle', 'Are you sure you want to remove container "{0}"?', nodes[0].label);
    } else {
        confirmRemove = localize('vscode-docker.commands.containers.remove.confirmMulti', 'Are you sure you want to remove selected containers?');
    }

    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmRemove, { modal: true }, { title: localize('vscode-docker.commands.containers.remove.remove', 'Remove') });

    const removing: string = localize('vscode-docker.commands.containers.remove.removing', 'Removing container(s)...');
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: removing }, async () => {
        await Promise.all(nodes.map(async n => await n.deleteTreeItem(context)));
    });
}
