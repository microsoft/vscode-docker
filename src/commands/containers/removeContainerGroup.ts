/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { ContainerGroupTreeItem } from '../../tree/containers/ContainerGroupTreeItem';
import { multiSelectNodes } from '../../utils/multiSelectNodes';

export async function removeContainerGroup(context: IActionContext, node?: ContainerGroupTreeItem, nodes?: ContainerGroupTreeItem[]): Promise<void> {
    nodes = await multiSelectNodes(
        { ...context, suppressCreatePick: true, noItemFoundErrorMessage: vscode.l10n.t('No container groups are available to remove') },
        ext.containersTree,
        node?.contextValue,
        node,
        nodes
    );

    let confirmRemove: string;
    if (nodes.length === 1) {
        confirmRemove = vscode.l10n.t('Are you sure you want to remove container group "{0}"?', nodes[0].label);
    } else {
        confirmRemove = vscode.l10n.t('Are you sure you want to remove selected container groups?');
    }

    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmRemove, { modal: true }, { title: vscode.l10n.t('Remove') });

    const removing: string = vscode.l10n.t('Removing container group(s)...');
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: removing }, async () => {
        await Promise.all(nodes.map(async n => await n.deleteTreeItem(context)));
    });
}
