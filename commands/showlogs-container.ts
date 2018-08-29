/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerNode } from '../explorer/models/containerNode';
import { ext } from '../extensionVariables';
import { ContainerItem, quickPickContainer } from './utils/quick-pick-container';

export async function showLogsContainer(context?: ContainerNode): Promise<void> {
    let containerToLog: Docker.ContainerDesc; //asdf

    if (context && context.containerDesc) {
        containerToLog = context.containerDesc;
    } else {
        const opts = {
            "filters": {
                "status": ["running"]
            }
        };
        const selectedItem: ContainerItem = await quickPickContainer(false, opts);
        containerToLog = selectedItem.containerDesc;
    }

    const terminal = ext.terminalProvider.createTerminal(containerToLog.Image);
    terminal.sendText(`docker logs -f ${containerToLog.Id}`);
    terminal.show();
}
