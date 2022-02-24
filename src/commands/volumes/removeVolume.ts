/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../../extensionVariables';
import { localize } from "../../localize";
import { VolumeTreeItem } from '../../tree/volumes/VolumeTreeItem';
import { multiSelectNodes } from '../../utils/multiSelectNodes';

export async function removeVolume(context: IActionContext, node?: VolumeTreeItem, nodes?: VolumeTreeItem[]): Promise<void> {
    nodes = await multiSelectNodes(
        { ...context, suppressCreatePick: true, noItemFoundErrorMessage: localize('vscode-docker.commands.volumes.remove.noVolumes', 'No volumes are available to remove') },
        ext.volumesTree,
        VolumeTreeItem.contextValue,
        node,
        nodes
    );

    let confirmRemove: string;
    if (nodes.length === 1) {
        confirmRemove = localize('vscode-docker.commands.volumes.remove.confirmSingle', 'Are you sure you want to remove volume "{0}"?', nodes[0].label);
    } else {
        confirmRemove = localize('vscode-docker.commands.volumes.remove.confirmMulti', 'Are you sure you want to remove selected volumes?');
    }

    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmRemove, { modal: true }, { title: localize('vscode-docker.commands.volumes.remove.remove', 'Remove') });

    const removing: string = localize('vscode-docker.commands.volumes.remove.removing', 'Removing volume(s)...');
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: removing }, async () => {
        await Promise.all(nodes.map(async n => await n.deleteTreeItem(context)));
    });
}
