import { docker } from './utils/docker-endpoint';
import { ContainerItem, quickPickContainer } from './utils/quick-pick-container';
import { reporter } from '../telemetry/telemetry';
import { ContainerNode } from '../explorer/models/containerNode';
import { dockerExplorerProvider } from '../dockerExtension';

import vscode = require('vscode');

const teleCmdId: string = 'vscode-docker.container.restart';


export async function restartContainer(context?: ContainerNode) {

    let containersToRestart: Docker.ContainerDesc[];

    if (context && context.containerDesc) {
        containersToRestart = [context.containerDesc];
    }
    else {
        const opts = {
            "filters": {
                "status": ["running", "paused", "exited"]
            }
        };
        const selectedItem: ContainerItem = await quickPickContainer(true, opts);
        if (selectedItem) {
            if (selectedItem.label.toLocaleLowerCase().includes("all containers")) {
                containersToRestart = await docker.getContainerDescriptors(opts);
            }
            else {
                containersToRestart = [selectedItem.containerDesc];
            }
        }
    }

    if (containersToRestart) {

        const numContainers: number = containersToRestart.length;
        let containerCounter: number = 0;

        vscode.window.setStatusBarMessage("Docker: Restarting Container(s)...", new Promise((resolve, reject) => {
            containersToRestart.forEach((container) => {
                docker.getContainer(container.Id).restart((err: Error, data: any) => {
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

        if (reporter) {
            reporter.sendTelemetryEvent('command', {
                command: teleCmdId
            });
        }
    }
}