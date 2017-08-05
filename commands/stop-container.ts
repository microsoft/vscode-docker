import { docker } from './utils/docker-endpoint';
import { ContainerItem, quickPickContainer } from './utils/quick-pick-container';
import { reporter } from '../telemetry/telemetry';
import vscode = require('vscode');

const teleCmdId: string = 'vscode-docker.container.stop';

export async function stopContainer() {

    const selectedItem: ContainerItem = await quickPickContainer(true);
    let containersToStop: Docker.ContainerDesc[];

    if (selectedItem) {

        if (selectedItem.label.toLowerCase().includes('all containers')) {
            containersToStop = await docker.getContainerDescriptors();
        } else {
            containersToStop = [selectedItem.containerDesc];
        }

        containersToStop.forEach((c) => {
            docker.getContainer(c.Id).stop();
        });
    }

    if (reporter) {
        reporter.sendTelemetryEvent('command', {
            command: teleCmdId
        });
    }
}

