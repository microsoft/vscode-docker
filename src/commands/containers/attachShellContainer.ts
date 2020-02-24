/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';
import { getDockerOSType } from '../../utils/osUtils';
import { selectTemplate } from '../selectTemplate';

export async function attachShellContainer(context: IActionContext, node?: ContainerTreeItem): Promise<void> {
    if (!node) {
        node = await ext.containersTree.showTreeItemPicker<ContainerTreeItem>(ContainerTreeItem.runningContainerRegExp, {
            ...context,
            noItemFoundErrorMessage: 'No running containers are available to attach'
        });
    }

    let osType = await getDockerOSType(context);
    context.telemetry.properties.dockerOSType = osType;

    let shellCommand: string;
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    if (osType === 'windows') {
        shellCommand = configOptions.get('attachShellCommand.windowsContainer');
    } else {
        shellCommand = configOptions.get('attachShellCommand.linuxContainer');
    }
    context.telemetry.properties.shellCommand = shellCommand;

    const terminalCommand = await selectTemplate(
        context,
        'attach',
        `${node.containerName} ${node.fullTag}`,
        undefined,
        { 'shellCommand': shellCommand, 'containerId': node.containerId }
    );

    const terminal = ext.terminalProvider.createTerminal(`Shell: ${node.containerName}`);
    terminal.sendText(terminalCommand);
    terminal.show();
}
