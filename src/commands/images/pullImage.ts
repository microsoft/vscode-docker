/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { ImageTreeItem } from '../../tree/images/ImageTreeItem';

export async function pullImage(context: IActionContext, node: ImageTreeItem | undefined): Promise<void> {
    if (!node) {
        node = await ext.imagesTree.showTreeItemPicker<ImageTreeItem>(ImageTreeItem.contextValue, context);
    }

    const terminal = ext.terminalProvider.createTerminal(node.fullTag);
    terminal.sendText(`docker pull ${node.fullTag}`);
    terminal.show();
}
