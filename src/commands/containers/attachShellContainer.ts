/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { DockerOSType } from '../../docker/Common';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';
import { getDockerOSType } from '../../utils/osUtils';
import { selectAttachCommand } from '../selectCommandTemplate';

export async function attachShellContainer(context: IActionContext, node?: ContainerTreeItem): Promise<void> {
    if (!node) {
        await ext.containersTree.refresh();
        node = await ext.containersTree.showTreeItemPicker<ContainerTreeItem>(ContainerTreeItem.runningContainerRegExp, {
            ...context,
            noItemFoundErrorMessage: localize('vscode-docker.commands.containers.attachShellContainer.noContainers', 'No running containers are available to attach')
        });
    }

    let osType: DockerOSType;
    try {
        // TODO: get OS type from container instead of from system
        osType = await getDockerOSType(context);
    } catch {
        // Assume linux
        osType = 'linux';
    }

    context.telemetry.properties.dockerOSType = osType;

    let shellCommand: string;
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    if (osType === 'windows') {
        shellCommand = configOptions.get('attachShellCommand.windowsContainer');
    } else {
        shellCommand = configOptions.get('attachShellCommand.linuxContainer');
    }
    context.telemetry.properties.shellCommand = shellCommand;

    const terminalCommand = await selectAttachCommand(
        context,
        node.containerName,
        node.fullTag,
        node.containerId,
        shellCommand
    );

    const terminal = ext.terminalProvider.createTerminal(`Shell: ${node.containerName}`);
    terminal.sendText(terminalCommand);
    terminal.show();
}
