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

    const allIds: string[] = [];

    const items: ImageItem[] = [];

    for (let i = 0; i < images.length; i++) {
        if (!images[i].RepoTags) {
            const item = createItem(images[i], '<none>:<none>');
            allIds.push(item.ids[0]);
            items.push(item);
        } else {

            for (let j = 0; j < images[i].RepoTags.length; j++) {
                const item = createItem(images[i], images[i].RepoTags[j]);
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

export async function quickPickImage(includeAll?: boolean): Promise<ImageItem> {

    const images = await docker.getImageDescriptors();

    if (!images || images.length == 0) {
        vscode.window.showInformationMessage('There are no docker images yet. Try Build first.');
        return;
    } else {
        const items: ImageItem[] = computeItems(images, includeAll);
        return vscode.window.showQuickPick(items, { placeHolder: 'Choose image' });
    }

}