/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { ContextTreeItem } from '../../tree/contexts/ContextTreeItem';

export async function useDockerContext(actionContext: IActionContext, node?: ContextTreeItem): Promise<void> {
    let invokedFromCommandPalette = false;
    if (!node) {
        node = await ext.contextsTree.showTreeItemPicker<ContextTreeItem>(ContextTreeItem.allContextRegExp, {
            ...actionContext,
            noItemFoundErrorMessage: vscode.l10n.t('No Docker contexts are available to use'),
        });
        invokedFromCommandPalette = true;
    }

    // Await the `docker context use` command
    await node.use();

    if (invokedFromCommandPalette) {
        void vscode.window.showInformationMessage(vscode.l10n.t('Using Docker context \'{0}\'', node.name));
    }
}
