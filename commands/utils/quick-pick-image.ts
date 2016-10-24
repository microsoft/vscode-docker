import * as Docker from 'dockerode';
import { docker } from './docker-endpoint';
import vscode = require('vscode');

export interface ImageItem extends vscode.QuickPickItem {
    ids: string[],
    parentId: string,
    created: Date,
    repoTags: string[],
    size: Number,
    virtualSize: Number
}

function createItem(image: Docker.ImageDesc, repoTag: string): ImageItem {


    return <ImageItem>{
        label: repoTag || '<none>',
        description: null,
        ids: [image.Id],
        parentId: image.ParentId,
        created: image.Created,
        repoTags: image.RepoTags,
        size: image.Size,
        virtualSize: image.VirtualSize
    };
}

function computeItems(images: Docker.ImageDesc[], includeAll?: boolean): ImageItem[] {

    let allIds: string[] = [];

    let items: ImageItem[] = [];

    for (let i = 0; i < images.length; i++) {
        if (!images[i].RepoTags) {
            let item = createItem(images[i], '<none>:<none>');
            allIds.push(item.ids[0]);
            items.push(item);
        } else {

            for (let j = 0; j < images[i].RepoTags.length; j++) {
                let item = createItem(images[i], images[i].RepoTags[j]);
                allIds.push(item.ids[0]);
                items.push(item);
            }
        }

    }


    if (includeAll && allIds.length > 0) {
        items.unshift(<ImageItem>{
            label: 'All Images',
            description: 'Remove all images',
            ids: allIds
        });
    }

    return items;
}

export function quickPickImage(includeAll?: boolean): Thenable<ImageItem> {
    return docker.getImageDescriptors().then(images => {
        if (!images || images.length == 0) {
            vscode.window.showInformationMessage('There are no docker images yet. Try Build first.');
            return Promise.resolve(null);
        } else {
            let items: ImageItem[] = computeItems(images, includeAll);
            return vscode.window.showQuickPick(items, { placeHolder: 'Choose image' });
        }
    });
}