import * as Docker from 'dockerode';
import {docker} from './docker-endpoint';
import vscode = require('vscode');


export interface ContainerItem extends vscode.QuickPickItem {
    containerDesc: Docker.ContainerDesc
}

function createItem(container: Docker.ContainerDesc) : ContainerItem {
    return <ContainerItem> {
        label: container.Image,
        containerDesc: container
    };
}

function computeItems(containers: Docker.ContainerDesc[], includeAll: boolean) : ContainerItem[] {
    const items : ContainerItem[] = [];

    for (let i = 0; i < containers.length; i++) {
        const item = createItem(containers[i]);
        items.push(item);
    }

    if (includeAll && containers.length > 0) {
        items.unshift(<ContainerItem> {
            label: 'All Containers' 
        });
    }

    return items;
}

export async function quickPickContainer(includeAll: boolean = false, opts?: {}) : Promise<ContainerItem>{

    // "status": ["created", "restarting", "running", "paused", "exited", "dead"]
    if (!opts) {
        opts = {
            "filters": {
                "status": ["running"]
            }
        };
    };

    const containers = await docker.getContainerDescriptors(opts);

    if (!containers || containers.length == 0) {
        vscode.window.showInformationMessage('There are no Docker Containers.');
        return;
    } else {
        const items: ContainerItem[] = computeItems(containers, includeAll);
        return vscode.window.showQuickPick(items, { placeHolder: 'Choose container...' });
    }
}