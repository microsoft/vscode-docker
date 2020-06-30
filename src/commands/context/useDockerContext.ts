/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ContextTreeItem } from '../../tree/contexts/ContextTreeItem';
import { LocalRootTreeItemBase } from '../../tree/LocalRootTreeItemBase';

export async function useDockerContext(actionContext: IActionContext, node?: ContextTreeItem): Promise<void> {
    let invokedFromCommandPalette = false;
    if (!node) {
        node = await ext.contextsTree.showTreeItemPicker<ContextTreeItem>(ContextTreeItem.allContextRegExp, {
            ...actionContext,
            noItemFoundErrorMessage: localize('vscode-docker.commands.contexts.use.noContexts', 'No Docker contexts are available to use')
        });
        invokedFromCommandPalette = true;
    }

    try {
        LocalRootTreeItemBase.autoRefreshViews = false;
        await node.runWithTemporaryDescription(
            localize('vscode-docker.tree.context.switching', 'Switching...'),
            async () => {
                // Await the `docker context use` command
                await node.use(actionContext);

                // Await the tree receiving the event which happens after the context manager refreshes
                await new Promise((resolve) => {
                    const disposable = ext.dockerContextManager.onContextChanged(() => {
                        disposable.dispose();
                        resolve();
                    });
                });
            });
    } finally {
        LocalRootTreeItemBase.autoRefreshViews = true;
    }

    if (invokedFromCommandPalette) {
        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        vscode.window.showInformationMessage(localize('vscode-docker.commands.context.contextInUse', 'Using Docker context \'{0}\'', node.name));
    }
}
