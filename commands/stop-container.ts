import { dockerExplorerProvider } from '../dockerExtension';
import { ContainerNode } from '../explorer/models/containerNode';
import { reporter } from '../telemetry/telemetry';
import { docker } from './utils/docker-endpoint';
import { ContainerItem, quickPickContainer } from './utils/quick-pick-container';

import vscode = require('vscode');

const teleCmdId: string = 'vscode-docker.container.stop';

export async function stopContainer(context?: ContainerNode): Promise<void> {

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
                // tslint:disable-next-line:no-function-expression // Grandfathered in
                docker.getContainer(c.Id).stop(function (err: Error, data: any): void {
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
