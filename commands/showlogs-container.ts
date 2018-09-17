/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { IActionContext } from 'vscode-azureextensionui';
import { ContainerNode } from '../explorer/models/containerNode';
import { RootNode } from '../explorer/models/rootNode';
import { ext } from '../extensionVariables';
import { reporter } from '../telemetry/telemetry';
import { ContainerItem, quickPickContainer } from './utils/quick-pick-container';
const teleCmdId: string = 'vscode-docker.container.show-logs';

export async function showLogsContainer(actionContext: IActionContext, context: RootNode | ContainerNode | undefined): Promise<void> {

    let containerToLog: Docker.ContainerDesc;

    if (context instanceof ContainerNode && context.containerDesc) {
        containerToLog = context.containerDesc;
    } else {
        const opts = {
            "filters": {
                "status": ["running"]
            }
        };
        const selectedItem: ContainerItem = await quickPickContainer(actionContext, false, opts);
        if (selectedItem) {
            containerToLog = selectedItem.containerDesc;
        }
    }

    if (containerToLog) {
        const terminal = ext.terminalProvider.createTerminal(containerToLog.Image);
        terminal.sendText(`docker logs -f ${containerToLog.Id}`);
        terminal.show();
        if (reporter) {
            /* __GDPR__
               "command" : {
                  "command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
               }
             */
            reporter.sendTelemetryEvent('command', {
                command: teleCmdId
            });
        }
    }
}
