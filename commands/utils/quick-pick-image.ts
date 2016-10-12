import * as Docker from 'dockerode';
import {docker} from './docker-endpoint';
import vscode = require('vscode');



export interface ImageItem extends vscode.QuickPickItem {
    id: string,
}

function createItem(image: Docker.ImageDesc) : ImageItem {
    return <ImageItem> {
        label: image.RepoTags[0] || '<none>',
        description: null,
        id: image.Id
    };
}

function computeItems(images: Docker.ImageDesc[]) : ImageItem[] {
    let items : ImageItem[] = [];
    for (let i = 0; i < images.length; i++) {
        items.push(createItem(images[i]));
    }
    return items;
}

export function quickPickImage() : Thenable<ImageItem> {
    return docker.getImageDescriptors().then(images => {
        if (!images || images.length == 0) {
            vscode.window.showInformationMessage('There are no docker images yet. Try Build first.');
            return Promise.resolve(null);
        } else {
            let items: ImageItem[] = computeItems(images);
            return vscode.window.showQuickPick(items, { placeHolder: 'Choose image' });
        }
    });
}