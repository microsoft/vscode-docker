import * as Docker from 'dockerode';
import { ContainerDesc } from 'dockerode';
import vscode = require('vscode');
import { docker } from './docker-endpoint';

export interface ContainerItem extends vscode.QuickPickItem {
    containerDesc: Docker.ContainerDesc
}

function createItem(container: Docker.ContainerDesc): ContainerItem {
    return <ContainerItem>{
        label: container.Image,
        containerDesc: container
    };
}

function computeItems(containers: Docker.ContainerDesc[], includeAll: boolean): ContainerItem[] {
    const items: ContainerItem[] = [];

    // tslint:disable-next-line:prefer-for-of // Grandfathered in
    for (let i = 0; i < containers.length; i++) {
        const item = createItem(containers[i]);
        items.push(item);
    }

    if (includeAll && containers.length > 0) {
        items.unshift(<ContainerItem>{
            label: 'All Containers'
        });
    }

    return items;
}

export async function quickPickContainer(includeAll: boolean = false, opts?: {}): Promise<ContainerItem> {
    let containers: ContainerDesc[];

    // "status": ["created", "restarting", "running", "paused", "exited", "dead"]
    if (!opts) {
        opts = {
            "filters": {
                "status": ["running"]
            }
        };
    }

    try {
        containers = await docker.getContainerDescriptors(opts);
        if (!containers || containers.length === 0) {
            vscode.window.showInformationMessage('There are no Docker Containers.');
            return;
        } else {
            const items: ContainerItem[] = computeItems(containers, includeAll);
            return vscode.window.showQuickPick(items, { placeHolder: 'Choose container...' });
        }
    } catch (error) {
        vscode.window.showErrorMessage('Unable to connect to Docker, is the Docker daemon running?');
        return;
    }

}
