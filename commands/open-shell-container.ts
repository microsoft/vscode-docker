import vscode = require('vscode');
import {docker} from './docker-endpoint';
import * as Docker from 'dockerode';


interface Item extends vscode.QuickPickItem {
    id: string
}

function createItem(container: Docker.ContainerDesc) : Item {
    return <Item> {
        label: container.Image,
        description: container.Status,
        id: container.Id
    };
}

function computeItems(containers: Docker.ContainerDesc[]) : vscode.QuickPickItem[] {
    let items : vscode.QuickPickItem[] = [];
    for (let i = 0; i < containers.length; i++) {
        items.push(createItem(containers[i]));
    }
    return items;
}

export function openShellContainer() {
    docker.getContainerDescriptors().then(containers => {
        if (!containers || containers.length == 0) {
            vscode.window.showInformationMessage('There are no running docker containers.');
        } else {
            let items: vscode.QuickPickItem[] = computeItems(containers);
            vscode.window.showQuickPick(items, { placeHolder: 'Choose Container' }).then(function (selectedItem: Item) {
                if (selectedItem) {
                    let terminal: vscode.Terminal = vscode.window.createTerminal(`sh ${selectedItem.label}`);
                    terminal.sendText(`docker exec -i -t ${selectedItem.id} /bin/sh`);
                    terminal.show();
                }
            });
        }
    });
}