/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { l10n } from 'vscode';
import { ContextTreeItem } from '../../tree/contexts/ContextTreeItem';

export async function removeDockerContext(actionContext: IActionContext, node?: ContextTreeItem): Promise<void> {
    if (!node) {
        node = await ext.contextsTree.showTreeItemPicker<ContextTreeItem>(ContextTreeItem.removableContextRegExp, {
            ...actionContext,
            noItemFoundErrorMessage: l10n.t('No Docker contexts are available to remove'),
            suppressCreatePick: true,
        });
    }

    const removeConfirmationMessage = l10n.t('Are you sure you want to remove Docker context \'{0}\'?', node.name);

    // no need to check result - cancel will throw a UserCancelledError
    await actionContext.ui.showWarningMessage(removeConfirmationMessage, { modal: true }, { title: l10n.t('Remove') });

    const removingMessage: string = l10n.t('Removing Docker context(s)...');
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: removingMessage }, async () => {
        await node.deleteTreeItem(actionContext);
    });
}
