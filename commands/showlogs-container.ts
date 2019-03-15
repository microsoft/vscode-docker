/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import { ContainerNode } from '../explorer/models/containerNode';
import { RootNode } from '../explorer/models/rootNode';
import { ext } from '../extensionVariables';
import { AllStatusFilter, ListContainerDescOptions } from './utils/docker-endpoint';
import { quickPickContainer } from './utils/quick-pick-container';

export async function showLogsContainer(actionContext: IActionContext, context: RootNode | ContainerNode | undefined): Promise<void> {

    let containerToLog: Docker.ContainerDesc;

    if (context instanceof ContainerNode && context.containerDesc) {
        containerToLog = context.containerDesc;
    } else {
        const opts: ListContainerDescOptions = {
            "filters": {
                "status": AllStatusFilter
            }
        };
        containerToLog = await quickPickContainer(actionContext, opts);
    }

    const terminal = ext.terminalProvider.createTerminal(containerToLog.Image);
    terminal.sendText(`docker logs -f ${containerToLog.Id}`);
    terminal.show();
}
