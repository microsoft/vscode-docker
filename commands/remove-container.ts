/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { parseError, UserCancelledError } from 'vscode-azureextensionui';
import { dockerExplorerProvider } from '../dockerExtension';
import { ContainerNode } from '../explorer/models/containerNode';
import { reporter } from '../telemetry/telemetry';
import { docker } from './utils/docker-endpoint';
import { ContainerItem, quickPickContainer } from './utils/quick-pick-container';

export async function removeContainer(context?: ContainerNode): Promise<void> {

    let containersToRemove: Docker.ContainerDesc[];

    if (context && context.containerDesc) {
        containersToRemove = [context.containerDesc];
    } else {
        const opts = {
            "filters": {
                "status": ["created", "restarting", "running", "paused", "exited", "dead"]
            }
        };
        const selectedItem: ContainerItem = await quickPickContainer(true, opts);
        if (selectedItem.label.toLowerCase().includes('all containers')) {
            containersToRemove = await docker.getContainerDescriptors(opts);
        } else {
            containersToRemove = [selectedItem.containerDesc];
        }
    }

    if (containersToRemove.length) {
        const numContainers: number = containersToRemove.length;
        let containerCounter: number = 0;

        vscode.window.setStatusBarMessage("Docker: Removing Container(s)...", new Promise((resolve, reject) => {
            containersToRemove.forEach((c) => {
                // tslint:disable-next-line:no-function-expression // Grandfathered in
                docker.getContainer(c.Id).remove({ force: true }, function (err: Error, data: any): void {
                    containerCounter++;
                    if (err) {
                        dockerExplorerProvider.refreshContainers(); //asdf
                        reject(err);
                    }
                    if (containerCounter === numContainers) {
                        dockerExplorerProvider.refreshContainers();
                        resolve();
                    } else {
                        reject(new Error('An error occurred removing a container'));
                    }
                });
            });
        }));
    } else {
        throw new UserCancelledError();
    }
}
