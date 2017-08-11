import * as Docker from 'dockerode';
import { docker } from './docker-endpoint';
import vscode = require('vscode');

export interface ImageItem extends vscode.QuickPickItem {
    imageDesc: Docker.ImageDesc
}

function createItem(image: Docker.ImageDesc, repoTag: string): ImageItem {

    return <ImageItem>{
        label: repoTag || '<none>',
        imageDesc: image
    };
}

function computeItems(images: Docker.ImageDesc[], includeAll?: boolean): ImageItem[] {
    const items: ImageItem[] = [];

    for (let i = 0; i < images.length; i++) {
        if (!images[i].RepoTags) {
            // dangling
            const item = createItem(images[i], '<none>:<none>');
            items.push(item);
        } else {

            for (let j = 0; j < images[i].RepoTags.length; j++) {
                const item = createItem(images[i], images[i].RepoTags[j]);
                items.push(item);
            }
        }

    }

    if (includeAll && images.length > 0) {
        items.unshift(<ImageItem>{
            label: 'All Images'
        });
    }

    return items;
}

export async function quickPickImage(includeAll?: boolean): Promise<ImageItem> {

    const images = await docker.getImageDescriptors();

    if (!images || images.length == 0) {
        vscode.window.showInformationMessage('There are no docker images. Try Docker Build first.');
        return;
    } else {
        const items: ImageItem[] = computeItems(images, includeAll);
        return vscode.window.showQuickPick(items, { placeHolder: 'Choose image...' });
    }

}