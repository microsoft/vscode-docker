/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, openReadOnlyContent } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ContextTreeItem } from '../../tree/contexts/ContextTreeItem';

export async function inspectDockerContext(actionContext: IActionContext, node?: ContextTreeItem): Promise<void> {
    if (!node) {
        node = await ext.contextsTree.showTreeItemPicker<ContextTreeItem>(ContextTreeItem.allContextRegExp, {
            ...actionContext,
            noItemFoundErrorMessage: localize('vscode-docker.commands.contexts.inspect.noContexts', 'No Docker contexts are available to inspect')
        });
    }

    const inspectResult = await node.inspect(actionContext);
    await openReadOnlyContent(node, inspectResult, '.json');
}
