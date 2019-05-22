/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { IActionContext } from 'vscode-azureextensionui';
import { ContainerNode } from '../explorer/models/containerNode';
import { RootNode } from '../explorer/models/rootNode';
import { ext } from '../src/extensionVariables';
import { docker, ListContainerDescOptions } from './utils/docker-endpoint';
import { quickPickContainerOrAll } from './utils/quick-pick-container';

export async function restartContainer(context: IActionContext, node: RootNode | ContainerNode | undefined): Promise<void> {

    let containersToRestart: Docker.ContainerDesc[];

    if (node instanceof ContainerNode && node.containerDesc) {
        containersToRestart = [node.containerDesc];
    } else {
        const opts: ListContainerDescOptions = {
            "filters": {
                "status": ["running", "paused", "exited"]
            }
        };
        containersToRestart = await quickPickContainerOrAll(context, opts);
    }

    const numContainers: number = containersToRestart.length;
    let containerCounter: number = 0;

    vscode.window.setStatusBarMessage("Docker: Restarting Container(s)...", new Promise((resolve, reject) => {
        containersToRestart.forEach((container) => {
            // tslint:disable-next-line:no-any
            docker.getContainer(container.Id).restart((err: Error, _data: any) => {
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
