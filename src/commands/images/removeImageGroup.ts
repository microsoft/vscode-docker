/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ImageGroupTreeItem } from '../../tree/images/ImageGroupTreeItem';

export async function removeImageGroup(context: IActionContext, node?: ImageGroupTreeItem, nodes?: ImageGroupTreeItem[]): Promise<void> {
    // nodes = await multiSelectNodes(
    //     { ...context, suppressCreatePick: true, noItemFoundErrorMessage: vscode.l10n.t('No image groups are available to remove') },
    //     ext.imagesTree,
    //     ImageGroupTreeItem.contextValue,
    //     node,
    //     nodes
    // );

    const images: AzExtTreeItem[] | undefined = node.getImages();
    if (!images) { return; }

    const confirmRemove = vscode.l10n.t('Are you sure you want to remove imagr group"{0}"? If there are other tags or child images for images within this group, only the tags will be removed.', node.label);

    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage (confirmRemove, { modal: true }, { title: 'Remove' });

    const removing: string = vscode.l10n.t('Removing image(s)...');
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: removing }, async () => {
        await Promise.all(images.map(async n => await n.deleteTreeItem(context)));
    });
}
