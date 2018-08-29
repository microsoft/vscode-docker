/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as process from 'process';
import * as vscode from 'vscode';
import { IActionContext, TelemetryProperties } from 'vscode-azureextensionui';
import { ContainerNode } from '../explorer/models/containerNode';
import { ext } from '../extensionVariables';
import { docker, DockerEngineType } from './utils/docker-endpoint';
import { ContainerItem, quickPickContainer } from './utils/quick-pick-container';

const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
const engineTypeShellCommands = {
    [DockerEngineType.Linux]: configOptions.get('attachShellCommand.linuxContainer', '/bin/sh'),
    [DockerEngineType.Windows]: configOptions.get('attachShellCommand.windowsContainer', 'powershell')
}

export async function openShellContainer(actionContext: IActionContext, node?: ContainerNode): Promise<void> {
    let properties: {
        platform?: string;
        engineType?: string;
    } & TelemetryProperties;

    let containerToAttach: Docker.ContainerDesc; //asdf

    if (node && node.containerDesc) {
        containerToAttach = node.containerDesc;
    } else {
        const opts = {
            "filters": {
                "status": ["running"]
            }
        };
        const selectedItem: ContainerItem = await quickPickContainer(false, opts);
        containerToAttach = selectedItem.containerDesc;
    }

    let engineType: DockerEngineType = await docker.getEngineType();

    properties.platform = process.platform;
    properties.engineType = String(engineType); //asdf

    const terminal = ext.terminalProvider.createTerminal(`Shell: ${containerToAttach.Image}`);
    terminal.sendText(`docker exec -it ${containerToAttach.Id} ${engineTypeShellCommands[engineType]}`);
    terminal.show();
}
