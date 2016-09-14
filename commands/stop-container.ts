import vscode = require('vscode');
import {docker} from './docker-endpoint';
import * as Docker from 'dockerode';


interface Item extends vscode.QuickPickItem {
    ids: string[]
}

function createItem(container: Docker.ContainerDesc) : Item {
    return <Item> {
        label: container.Image,
        description: container.Status,
        ids: [ container.Id ]
    };
}

function computeItems(containers: Docker.ContainerDesc[]) : vscode.QuickPickItem[] {

    let allIds: string[] = [];

    let items : vscode.QuickPickItem[] = [];
    for (let i = 0; i < containers.length; i++) {
        let item = createItem(containers[i]);
        allIds.push(item.ids[0]);
        items.push(item);
    }

    if (allIds.length > 0) {
        items.unshift(<Item> {
            label: 'All Containers',
            description: 'Stops all running containers',
            ids: allIds
        });
    }

    return items;
}

export function stopContainer() {
    docker.getContainerDescriptors().then(containers => {
        if (!containers || containers.length == 0) {
            vscode.window.showInformationMessage('There are no running docker containers.');
        } else {
            let items: vscode.QuickPickItem[] = computeItems(containers);
            vscode.window.showQuickPick(items, { placeHolder: 'Choose Container' }).then(function (selectedItem: Item) {
                if (selectedItem) {
                    for (let i = 0; i < selectedItem.ids.length; i++) {
                        let container = docker.getContainer(selectedItem.ids[i]);
                        container.stop(function (err, data) {
                            console.log("Stopped - error: " + err);
                            console.log("Stopped - data: " + data);
                        });
                    }
                }
            });
        }
    });
}