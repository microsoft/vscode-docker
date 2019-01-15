/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { dockerExplorerProvider } from '../dockerExtension';
import { ContainerNode } from '../explorer/models/containerNode';
import { docker, ListContainerDescOptions } from './utils/docker-endpoint';
import { ContainerItem, quickPickContainer, quickPickContainerOrAll } from './utils/quick-pick-container';

import vscode = require('vscode');
import { IActionContext } from 'vscode-azureextensionui';
import { RootNode } from '../explorer/models/rootNode';

export async function stopContainer(actionContext: IActionContext, context: RootNode | ContainerNode | undefined): Promise<void> {
    let containersToStop: Docker.ContainerDesc[];

    if (context instanceof ContainerNode && context.containerDesc) {
        containersToStop = [context.containerDesc];
    } else {
        const opts: ListContainerDescOptions = {
            "filters": {
                "status": ["restarting", "running", "paused"]
            }
        };
        containersToStop = await quickPickContainerOrAll(actionContext, opts);
    }

    const numContainers: number = containersToStop.length;
    let containerCounter: number = 0;

    vscode.window.setStatusBarMessage("Docker: Stopping Container(s)...", new Promise((resolve, reject) => {
        containersToStop.forEach((c) => {
            // tslint:disable-next-line:no-function-expression no-any // Grandfathered in
            docker.getContainer(c.Id).stop(function (err: Error, _data: any): void {
                containerCounter++;
                if (err) {
                    vscode.window.showErrorMessage(err.message);
                    dockerExplorerProvider.refreshContainers();
                    reject();
                }
                if (containerCounter === numContainers) {
                    dockerExplorerProvider.refreshContainers();
                    resolve();
                }
            });
        });
    }));
}
