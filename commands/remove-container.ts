import vscode = require('vscode');
import { dockerExplorerProvider } from '../dockerExtension';
import { ContainerNode } from '../explorer/models/containerNode';
import { reporter } from '../telemetry/telemetry';
import { docker } from './utils/docker-endpoint';
import { ContainerItem, quickPickContainer } from './utils/quick-pick-container';

const teleCmdId: string = 'vscode-docker.container.remove';

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
        if (selectedItem) {
            if (selectedItem.label.toLowerCase().includes('all containers')) {
                containersToRemove = await docker.getContainerDescriptors(opts);
            } else {
                containersToRemove = [selectedItem.containerDesc];
            }
        }
    }

    if (containersToRemove) {

        const numContainers: number = containersToRemove.length;
        let containerCounter: number = 0;

        vscode.window.setStatusBarMessage("Docker: Removing Container(s)...", new Promise((resolve, reject) => {
            containersToRemove.forEach((c) => {
                // tslint:disable-next-line:no-function-expression // Grandfathered in
                docker.getContainer(c.Id).remove({ force: true }, function (err: Error, data: any): void {
                    containerCounter++;
                    if (err) {
                        // TODO: parseError, proper error handling
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

    if (reporter) {
        /* __GDPR__
        "command" : {
            "command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
        }
        */
        reporter.sendTelemetryEvent("command", { command: teleCmdId });
    }

}
