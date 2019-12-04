/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';
import { getDockerOSType } from '../../utils/osUtils';

export async function attachShellContainer(context: IActionContext, node?: ContainerTreeItem): Promise<void> {
    if (!node) {
        node = await ext.containersTree.showTreeItemPicker<ContainerTreeItem>(ContainerTreeItem.allContextRegExp, context);
    }

    let osType = await getDockerOSType();
    context.telemetry.properties.dockerOSType = osType;

    let shellCommand: string;
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    if (osType === 'windows') {
        shellCommand = configOptions.get('attachShellCommand.windowsContainer');
    } else {
        shellCommand = configOptions.get('attachShellCommand.linuxContainer');
    }
    context.telemetry.properties.shellCommand = shellCommand;

    const terminal = ext.terminalProvider.createTerminal(`Shell: ${node.containerName}`);
    terminal.sendText(`docker exec -it ${node.containerId} ${shellCommand}`);
    terminal.show();
}
