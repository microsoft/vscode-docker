/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { dockerExplorerProvider } from '../dockerExtension';
import { ContainerNode } from '../explorer/models/containerNode';
import { reporter } from '../telemetry/telemetry';
import { docker } from './utils/docker-endpoint';
import { ContainerItem, quickPickContainer } from './utils/quick-pick-container';

import vscode = require('vscode');
import { IActionContext, parseError } from 'vscode-azureextensionui';
import { RootNode } from '../explorer/models/rootNode';

const teleCmdId: string = 'vscode-docker.container.restart';

export async function restartContainer(actionContext: IActionContext, context: RootNode | ContainerNode | undefined): Promise<void> {

    let containersToRestart: Docker.ContainerDesc[];

    if (context instanceof ContainerNode && context.containerDesc) {
        containersToRestart = [context.containerDesc];
    } else {
        const opts = {
            "filters": {
                "status": ["running", "paused", "exited"]
            }
        };
        const selectedItem: ContainerItem = await quickPickContainer(actionContext, true, opts);
        if (selectedItem.allContainers) {
            containersToRestart = await docker.getContainerDescriptors(opts);
        } else {
            containersToRestart = [selectedItem.containerDesc];
        }
    }

    const numContainers: number = containersToRestart.length;
    let containerCounter: number = 0;

    vscode.window.setStatusBarMessage("Docker: Restarting Container(s)...", new Promise((resolve, reject) => {
        containersToRestart.forEach((container) => {
            // tslint:disable-next-line:no-any
            docker.getContainer(container.Id).restart((err: Error, _data: any) => {
                containerCounter++;
                if (err) { // testpoint
                    reject(parseError(err).message);
                    dockerExplorerProvider.refreshContainers();
                }
                if (containerCounter === numContainers) {
                    dockerExplorerProvider.refreshContainers();
                    resolve();
                }
            });
        });
    }));

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
