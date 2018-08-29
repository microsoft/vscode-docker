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

export async function stopContainer(context?: ContainerNode): Promise<void> {
    let containersToStop: Docker.ContainerDesc[]; //asdf

    if (context && context.containerDesc) {
        containersToStop = [context.containerDesc];
    } else {
        const opts = {
            "filters": {
                "status": ["restarting", "running", "paused"]
            }
        };
        const selectedItem: ContainerItem = await quickPickContainer(true, opts);
        if (selectedItem.label.toLowerCase().includes('all containers')) {
            containersToStop = await docker.getContainerDescriptors(opts);
        } else {
            containersToStop = [selectedItem.containerDesc];
        }
    }

    if (containersToStop.length) {

        const numContainers: number = containersToStop.length;
        let containerCounter: number = 0;

        vscode.window.setStatusBarMessage("Docker: Stopping Container(s)...", new Promise((resolve, reject) => {
            containersToStop.forEach((c) => {
                // tslint:disable-next-line:no-function-expression // Grandfathered in
                docker.getContainer(c.Id).stop(function (err: Error, data: any): void {
                    containerCounter++;
                    if (err) { //asdf
                        dockerExplorerProvider.refreshContainers();
                        reject(err);
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
