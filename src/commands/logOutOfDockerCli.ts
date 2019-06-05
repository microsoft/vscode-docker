/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Terminal } from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { DockerHubAccountTreeItem } from '../tree/dockerHub/DockerHubAccountTreeItem';
import { DockerHubNamespaceTreeItem } from '../tree/dockerHub/DockerHubNamespaceTreeItem';
import { RegistryTreeItemBase } from '../tree/RegistryTreeItemBase';

export async function logOutOfDockerCli(context: IActionContext, node?: RegistryTreeItemBase | DockerHubAccountTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<RegistryTreeItemBase | DockerHubAccountTreeItem>([DockerHubAccountTreeItem.contextValue, /^(azure|private)Registry$/i], context);
    }

    let command = 'docker logout';

    if (node instanceof DockerHubNamespaceTreeItem) {
        node = node.parent;
    }

    if (!(node instanceof DockerHubAccountTreeItem)) {
        command = `${command} ${node.baseUrl}`;
    }

    const terminal: Terminal = ext.terminalProvider.createTerminal('docker logout');
    terminal.sendText(command);
    terminal.show();
}
