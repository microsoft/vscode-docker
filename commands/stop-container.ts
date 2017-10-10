import { docker } from './utils/docker-endpoint';
import { ContainerItem, quickPickContainer } from './utils/quick-pick-container';
import { reporter } from '../telemetry/telemetry';
import { ContainerNode } from '../explorer/models/containerNode';
import { dockerExplorerProvider } from '../dockerExtension';

import vscode = require('vscode');

const teleCmdId: string = 'vscode-docker.container.stop';

export async function stopContainer(context?: ContainerNode) {

    let containersToStop: Docker.ContainerDesc[];

    if (context && context.containerDesc) {
        containersToStop = [context.containerDesc];
    } else {
        const opts = {
            "filters": {
                "status": ["restarting", "running", "paused"]
            }
        };
        const selectedItem: ContainerItem = await quickPickContainer(true, opts);
        if (selectedItem) {
            if (selectedItem.label.toLowerCase().includes('all containers')) {
                containersToStop = await docker.getContainerDescriptors(opts);
            } else {
                containersToStop = [selectedItem.containerDesc];
            }
        }
    }

    if (containersToStop) {

        const numContainers: number = containersToStop.length;
        let containerCounter: number = 0;

        vscode.window.setStatusBarMessage("Docker: Stopping Container(s)...", new Promise((resolve, reject) => {
            containersToStop.forEach((c) => {
                docker.getContainer(c.Id).stop(function (err: Error, data: any) {
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