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

export function removeImage() {
    docker.getImageDescriptors().then(images => {
        if (!images || images.length == 0) {
            vscode.window.showInformationMessage('There are no docker images yet. Try Build first.');
        } else {
            let items: vscode.QuickPickItem[] = computeItems(images);
            vscode.window.showQuickPick(items, { placeHolder: 'Choose image to delete' }).then(function(selectedItem : Item) {
                if (selectedItem) {
                    let image = docker.getImage(selectedItem.id);
                    image.remove({ force: true }, function (err, data) {
                        console.log("Removed - error: " + err);
                        console.log("Removed - data: " + data);
                    });
                }
            });
        }
    });
}