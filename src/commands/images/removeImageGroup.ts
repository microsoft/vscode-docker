/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { ImageGroupTreeItem } from '../../tree/images/ImageGroupTreeItem';
import { multiSelectNodes } from '../../utils/multiSelectNodes';

export async function removeImageGroup(context: IActionContext, node?: ImageGroupTreeItem, nodes?: ImageGroupTreeItem[]): Promise<void> {
    nodes = await multiSelectNodes(
        { ...context, suppressCreatePick: true, noItemFoundErrorMessage: vscode.l10n.t('No image groups are available to remove') },
        ext.imagesTree,
        ImageGroupTreeItem.contextValue,
        node,
        nodes
    );

    let confirmRemove: string;
    if (nodes.length === 1) {
        confirmRemove = vscode.l10n.t('Are you sure you want to remove image group "{0}"? If there are other tags or child images under the selected group, only the tag will be removed.', nodes[0].group);
    } else {
        confirmRemove = vscode.l10n.t('Are you sure you want to remove the selected image groups? If there are other tags or child images under the selected groups, only the tags will be removed.');
    }

    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage (confirmRemove, { modal: true }, { title: vscode.l10n.t('Remove') });

    const removing: string = vscode.l10n.t('Removing image(s)...');
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: removing }, async () => {
        await Promise.all(nodes.map(async n => await n.deleteTreeItem(context)));
    });
}
