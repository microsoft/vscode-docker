/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';
import { docker, DockerEngineType } from '../../utils/docker-endpoint';

export async function attachShellContainer(context: IActionContext, node?: ContainerTreeItem): Promise<void> {
    if (!node) {
        node = await ext.containersTree.showTreeItemPicker<ContainerTreeItem>(ContainerTreeItem.allContextRegExp, context);
    }

    let engineType = await docker.getEngineType();
    context.telemetry.properties.engineType = DockerEngineType[engineType];

    let shellCommand: string;
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    switch (engineType) {
        case DockerEngineType.Linux:
            shellCommand = configOptions.get('attachShellCommand.linuxContainer');
            break;
        case DockerEngineType.Windows:
            shellCommand = configOptions.get('attachShellCommand.windowsContainer');
            break;
        default:
            throw new RangeError(`Unexpected engine type ${engineType}`);
    }
    context.telemetry.properties.shellCommand = shellCommand;

    const terminal = ext.terminalProvider.createTerminal(`Shell: ${node.container.Image}`);
    terminal.sendText(`docker exec -it ${node.container.Id} ${shellCommand}`);
    terminal.show();
}
