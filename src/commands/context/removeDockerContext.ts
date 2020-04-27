/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ContextTreeItem } from '../../tree/contexts/ContextTreeItem';
import { multiSelectNodes } from '../../utils/multiSelectNodes';

export async function removeDockerContext(actionContext: IActionContext, node?: ContextTreeItem, nodes?: ContextTreeItem[]): Promise<void> {
    nodes = await multiSelectNodes(
        { ...actionContext, suppressCreatePick: true, noItemFoundErrorMessage: localize('vscode-docker.commands.contexts.remove.noContexts', 'No contexts are available to remove') },
        ext.contextsTree,
        ContextTreeItem.contextValue,
        node,
        nodes
    );

    if (nodes.length === 1 && nodes[0].current) {
        actionContext.errorHandling.suppressReportIssue = true;
        throw new Error(localize('vscode-docker.commands.context.remove.cannotRemoveContextInUse', 'Docker context \'{0}\' is currently in use and cannot be removed', nodes[0].name));
    }

    let removeConfirmationMessage: string;
    if (nodes.length === 1) {
        removeConfirmationMessage = localize('vscode-docker.commands.context.remove.confirmSingle', 'Are you sure you want to remove context \'{0}\'?', nodes[0].name);
    } else {
        const nonCurrentNodes = nodes.filter(n => !n.current)
        if (nodes.length === nonCurrentNodes.length) {
            removeConfirmationMessage = localize('vscode-docker.commands.context.remove.confirmMultiple', 'Are you sure you want to remove the selected contexts?');
        } else {
            removeConfirmationMessage = localize('vscode-docker.commands.context.remove.confirmSingleFiltered', 'The selected context includes an in use context, which can not be removed. Do you want to remove the rest of the contexts?');
        }
    }

    // no need to check result - cancel will throw a UserCancelledError
    await ext.ui.showWarningMessage(removeConfirmationMessage, { modal: true }, { title: localize('vscode-docker.commands.context.remove', 'Remove') });

    const removingMessage: string = localize('vscode-docker.commands.context.remove.removing', 'Removing context(s)...');
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: removingMessage }, async () => {
        await Promise.all(nodes.map(async n => await n.deleteTreeItem(actionContext)));
    });

    // TODO: Do we need to show notification after remove or the above progress is sufficient.
    // rest of the remove commands like remove image doesn't show notification after remove.

}
