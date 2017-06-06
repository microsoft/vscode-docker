import * as Docker from 'dockerode';
import {docker} from './docker-endpoint';
import vscode = require('vscode');


export interface ContainerItem extends vscode.QuickPickItem {
    ids: string[]
}

function createItem(container: Docker.ContainerDesc) : ContainerItem {
    return <ContainerItem> {
        label: container.Image,
        description: container.Status,
        ids: [ container.Id ]
    };
}

function computeItems(containers: Docker.ContainerDesc[], includeAll: boolean) : ContainerItem[] {

    const allIds: string[] = [];

    const items : ContainerItem[] = [];
    for (let i = 0; i < containers.length; i++) {
        const item = createItem(containers[i]);
        allIds.push(item.ids[0]);
        items.push(item);
    }

    if (includeAll && allIds.length > 0) {
        items.unshift(<ContainerItem> {
            label: 'All Containers',
            description: 'Stops all running containers',
            ids: allIds
        });
    }

    return items;
}

export async function quickPickContainer(includeAll: boolean = false) : Promise<ContainerItem>{
    const containers = await docker.getContainerDescriptors();

    if (!containers || containers.length == 0) {
        vscode.window.showInformationMessage('There are no running docker containers.');
        return;
    } else {
        const items: ContainerItem[] = computeItems(containers, includeAll);
        return vscode.window.showQuickPick(items, { placeHolder: 'Choose Container' });
    }
}