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

    let allIds: string[] = [];

    let items : ContainerItem[] = [];
    for (let i = 0; i < containers.length; i++) {
        let item = createItem(containers[i]);
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

export function quickPickContainer(includeAll: boolean = false) : Thenable<ContainerItem>{
    return docker.getContainerDescriptors().then(containers => {
        if (!containers || containers.length == 0) {
            vscode.window.showInformationMessage('There are no running docker containers.');
            return Promise.resolve(null);
        } else {
            let items: ContainerItem[] = computeItems(containers, includeAll);
            return vscode.window.showQuickPick(items, { placeHolder: 'Choose Container' });
        }
    });
}