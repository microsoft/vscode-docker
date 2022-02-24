/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ContextTreeItem } from '../../tree/contexts/ContextTreeItem';

export async function removeDockerContext(actionContext: IActionContext, node?: ContextTreeItem): Promise<void> {
    if (!node) {
        node = await ext.contextsTree.showTreeItemPicker<ContextTreeItem>(ContextTreeItem.removableContextRegExp, {
            ...actionContext,
            noItemFoundErrorMessage: localize('vscode-docker.commands.contexts.remove.noContexts', 'No Docker contexts are available to remove'),
            suppressCreatePick: true,
        });
    }

    const removeConfirmationMessage = localize('vscode-docker.commands.context.remove.confirmSingle', 'Are you sure you want to remove Docker context \'{0}\'?', node.name);

    // no need to check result - cancel will throw a UserCancelledError
    await actionContext.ui.showWarningMessage(removeConfirmationMessage, { modal: true }, { title: localize('vscode-docker.commands.context.remove', 'Remove') });

    const removingMessage: string = localize('vscode-docker.commands.context.remove.removing', 'Removing Docker context(s)...');
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: removingMessage }, async () => {
        await node.deleteTreeItem(actionContext);
    });
}
