/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Terminal } from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { registryExpectedContextValues } from '../../tree/registries/registryContextValues';
import { RegistryTreeItemBase } from '../../tree/registries/RegistryTreeItemBase';

export async function logOutOfDockerCli(context: IActionContext, node?: RegistryTreeItemBase): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<RegistryTreeItemBase>(registryExpectedContextValues.all.registry, context);
    }

    let creds = await node.getDockerCliCredentials();
    const terminal: Terminal = ext.terminalProvider.createTerminal('docker logout');
    terminal.sendText(`docker logout ${creds.registryPath}`);
    terminal.show();
}
