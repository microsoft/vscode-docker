/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { UserCancelledError } from 'vscode-azureextensionui';
import { dockerExplorerProvider } from '../dockerExtension';
import { ContainerNode } from '../explorer/models/containerNode';
import { docker } from './utils/docker-endpoint';
import { ContainerItem, quickPickContainer } from './utils/quick-pick-container';

export async function restartContainer(context?: ContainerNode): Promise<void> {
    let containersToRestart: Docker.ContainerDesc[];
    //asdf
    if (context && context.containerDesc) {
        containersToRestart = [context.containerDesc];
    } else {
        const opts = {
            "filters": {
                "status": ["running", "paused", "exited"]
            }
        };
        const selectedItem: ContainerItem = await quickPickContainer(true, opts);
        if (selectedItem.label.toLocaleLowerCase().includes("all containers")) {
            containersToRestart = await docker.getContainerDescriptors(opts);
        } else {
            containersToRestart = [selectedItem.containerDesc];
        }
    }

    if (containersToRestart.length) {
        const numContainers: number = containersToRestart.length;
        let containerCounter: number = 0;

        vscode.window.setStatusBarMessage("Docker: Restarting Container(s)...", new Promise((resolve, reject) => {
            containersToRestart.forEach((container) => {
                docker.getContainer(container.Id).restart((err: Error, data: any) => {
                    containerCounter++;
                    if (err) {
                        dockerExplorerProvider.refreshContainers();
                        reject(err); //asdf
                    }

                    if (containerCounter === numContainers) {
                        dockerExplorerProvider.refreshContainers();
                        resolve();
                    }
                });
            });
        }));
    } else {
        throw new UserCancelledError();
    }
}
