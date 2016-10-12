import * as Docker from 'dockerode';
import {docker} from './docker-endpoint';
import vscode = require('vscode');

export interface ImageItem extends vscode.QuickPickItem {
    ids: string[],
}

function createItem(image: Docker.ImageDesc) : ImageItem {
    return <ImageItem> {
        label: image.RepoTags[0] || '<none>',
        description: null,
        ids: [image.Id]
    };
}

function computeItems(images: Docker.ImageDesc[], includeAll?: boolean) : ImageItem[] {
    
    let allIds: string[] = [];
    
    let items : ImageItem[] = [];
    for (let i = 0; i < images.length; i++) {
        let item = createItem(images[i]);
        allIds.push(item.ids[0]);
        items.push(item);
    }

    if (includeAll && allIds.length > 0) {
        items.unshift(<ImageItem> {
            label: 'All Images',
            description: 'Removes all images',
            ids: allIds
        });
    }

    return items;
}

export function quickPickImage() : Thenable<ImageItem> {
    return docker.getImageDescriptors().then(images => {
        if (!images || images.length == 0) {
            vscode.window.showInformationMessage('There are no docker images yet. Try Build first.');
            return Promise.resolve(null);
        } else {
            let items: ImageItem[] = computeItems(images, true);
            return vscode.window.showQuickPick(items, { placeHolder: 'Choose image' });
        }
    });
}