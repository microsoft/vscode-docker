/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';
import { selectLogsCommand } from '../selectCommandTemplate';

export async function viewContainerLogs(context: IActionContext, node?: ContainerTreeItem): Promise<void> {
    if (!node) {
        node = await ext.containersTree.showTreeItemPicker<ContainerTreeItem>(ContainerTreeItem.allContextRegExp, {
            ...context,
            noItemFoundErrorMessage: 'No continers are available to view logs'
        });
    }

    const terminalCommand = await selectLogsCommand(
        context,
        node.containerName,
        node.fullTag,
        node.containerId
    );

    const terminal = ext.terminalProvider.createTerminal(node.fullTag);
    terminal.sendText(terminalCommand);
    terminal.show();
}
