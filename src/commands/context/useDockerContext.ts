/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ContextTreeItem } from '../../tree/contexts/ContextTreeItem';

export async function useDockerContext(actionContext: IActionContext, node?: ContextTreeItem): Promise<void> {
    let invokedFromCommandPalette = false;
    if (!node) {
        node = await ext.contextsTree.showTreeItemPicker<ContextTreeItem>(ContextTreeItem.contextValue, {
            ...actionContext,
            noItemFoundErrorMessage: localize('vscode-docker.commands.contexts.use.noContexts', 'No Docker contexts are available to use')
        });
        invokedFromCommandPalette = true;
    }

    await node.use(actionContext);
    await ext.contextsRoot.refresh();

    if (invokedFromCommandPalette) {
        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        vscode.window.showInformationMessage(localize('vscode-docker.commands.context.contextInUse', 'Using Docker context \'{0}\'', node.name));
    }
}
