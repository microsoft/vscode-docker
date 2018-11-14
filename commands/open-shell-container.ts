/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ContainerNode } from '../explorer/models/containerNode';
import { RootNode } from '../explorer/models/rootNode';
import { ext } from '../extensionVariables';
import { docker, DockerEngineType } from './utils/docker-endpoint';
import { ContainerItem, quickPickContainer } from './utils/quick-pick-container';
const teleCmdId: string = 'vscode-docker.container.open-shell';

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

export async function openShellContainer(actionContext: IActionContext, context: RootNode | ContainerNode | undefined): Promise<void> {
    let containerToAttach: Docker.ContainerDesc;

    if (context instanceof ContainerNode && context.containerDesc) {
        containerToAttach = context.containerDesc;
    } else {
        const opts = {
            "filters": {
                "status": ["running"]
            }
        };
        const selectedItem: ContainerItem = await quickPickContainer(actionContext, false, opts);
        if (selectedItem) {
            containerToAttach = selectedItem.containerDesc;
        }
    }

    if (containerToAttach) {
        let engineType = await docker.getEngineType();
        actionContext.properties.engineType = DockerEngineType[engineType];
        const shellCommand = getEngineTypeShellCommands(engineType);
        actionContext.properties.shellCommand = shellCommand;
        const terminal = ext.terminalProvider.createTerminal(`Shell: ${containerToAttach.Image}`);
        terminal.sendText(`docker exec -it ${containerToAttach.Id} ${shellCommand}`);
        terminal.show();
    }
}
