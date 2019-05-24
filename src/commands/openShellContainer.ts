/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ContainerNode } from '../../explorer/models/containerNode';
import { RootNode } from '../../explorer/models/rootNode';
import { ext } from '../extensionVariables';
import { docker, DockerEngineType, ListContainerDescOptions } from '../utils/docker-endpoint';
import { quickPickContainer } from '../utils/quick-pick-container';

function getEngineTypeShellCommands(engineType: DockerEngineType): string {
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    switch (engineType) {
        case DockerEngineType.Linux:
            return configOptions.get('attachShellCommand.linuxContainer');
        case DockerEngineType.Windows:
            return configOptions.get('attachShellCommand.windowsContainer');
        default:
            throw new Error(`Unexpected engine type ${engineType}`);
    }
}

export async function openShellContainer(context: IActionContext, node: RootNode | ContainerNode | undefined): Promise<void> {
    let containerToAttach: Docker.ContainerDesc;

    if (node instanceof ContainerNode && node.containerDesc) {
        containerToAttach = node.containerDesc;
    } else {
        const opts: ListContainerDescOptions = {
            "filters": {
                "status": ["running"]
            }
        };
        containerToAttach = await quickPickContainer(context, opts);
    }

    let engineType = await docker.getEngineType();
    context.telemetry.properties.engineType = DockerEngineType[engineType];
    const shellCommand = getEngineTypeShellCommands(engineType);
    context.telemetry.properties.shellCommand = shellCommand;
    const terminal = ext.terminalProvider.createTerminal(`Shell: ${containerToAttach.Image}`);
    terminal.sendText(`docker exec -it ${containerToAttach.Id} ${shellCommand}`);
    terminal.show();
}
