/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, openReadOnlyJson } from '@microsoft/vscode-azext-utils';
import { l10n } from 'vscode';
import { ext } from '../../extensionVariables';
import { ContextTreeItem } from '../../tree/contexts/ContextTreeItem';

export async function inspectDockerContext(actionContext: IActionContext, node?: ContextTreeItem): Promise<void> {
    if (!node) {
        node = await ext.contextsTree.showTreeItemPicker<ContextTreeItem>(ContextTreeItem.allContextRegExp, {
            ...actionContext,
            noItemFoundErrorMessage: l10n.t('No Docker contexts are available to inspect'),
            suppressCreatePick: true,
        });
    }

    const inspectResult = await node.inspect();
    await openReadOnlyJson(node, JSON.parse(inspectResult.raw));
}
