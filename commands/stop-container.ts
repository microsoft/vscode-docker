/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import { ContainerNode } from '../explorer/models/containerNode';
import { RootNode } from '../explorer/models/rootNode';
import { ext } from '../src/extensionVariables';
import { docker, ListContainerDescOptions } from './utils/docker-endpoint';
import { quickPickContainerOrAll } from './utils/quick-pick-container';

import vscode = require('vscode');

export async function stopContainer(context: IActionContext, node: RootNode | ContainerNode | undefined): Promise<void> {
    let containersToStop: Docker.ContainerDesc[];

    if (node instanceof ContainerNode && node.containerDesc) {
        containersToStop = [node.containerDesc];
    } else {
        const opts: ListContainerDescOptions = {
            "filters": {
                "status": ["restarting", "running", "paused"]
            }
        };
        containersToStop = await quickPickContainerOrAll(context, opts);
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
                    ext.dockerExplorerProvider.refreshContainers();
                    reject();
                }
                if (containerCounter === numContainers) {
                    ext.dockerExplorerProvider.refreshContainers();
                    resolve();
                }
            });
        });
    }));
}
