import vscode = require('vscode');
import {docker} from './docker-endpoint';
import * as Docker from 'dockerode';

interface Item extends vscode.QuickPickItem {
    id: string,
}

function createItem(image: Docker.ImageDesc) : Item {
    return <Item> {
        label: image.RepoTags[0] || '<none>',
        description: null,
        id: image.Id
    };
}

function computeItems(images: Docker.ImageDesc[]) : vscode.QuickPickItem[] {
    let items : vscode.QuickPickItem[] = [];
    for (let i = 0; i < images.length; i++) {
        items.push(createItem(images[i]));
    }
    return items;
}

export function pushImage() {
    docker.getImageDescriptors().then(images => {
        if (!images || images.length == 0) {
            vscode.window.showInformationMessage('There are no docker images yet. Try Build first.');
        } else {
            let items: vscode.QuickPickItem[] = computeItems(images);
            vscode.window.showQuickPick(items, { placeHolder: 'Choose image to push' }).then(function(selectedItem : Item) {
                if (selectedItem) {
                    let terminal: vscode.Terminal = vscode.window.createTerminal(selectedItem.label);
                    terminal.sendText(`docker push ${selectedItem.label}`);
                    terminal.show();
                    };
                }
            );
        }
    });
}



