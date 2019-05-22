/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as Docker from 'dockerode';
import * as path from "path";
import vscode = require('vscode');
import { IActionContext, TelemetryProperties } from 'vscode-azureextensionui';
import { throwDockerConnectionError } from '../../explorer/utils/dockerConnectionError';
import { delay } from '../../explorer/utils/utils';
import { ext } from '../../extensionVariables';
import { addImageTaggingTelemetry, getTagFromUserInput } from '../tag-image';
import { docker } from './docker-endpoint';
import { Item } from './quick-pick-file';

export interface ImageItem extends vscode.QuickPickItem {
    label: string; // This is the full tag of the image
    imageDesc: Docker.ImageDesc;
    allImages: boolean;
}

function createItem(image: Docker.ImageDesc, fullTag: string): ImageItem {
    return <ImageItem>{
        label: fullTag,
        imageDesc: image,
    };
}

function computeItems(images: Docker.ImageDesc[], includeAll?: boolean): ImageItem[] {
    const items: ImageItem[] = [];

    // tslint:disable-next-line:prefer-for-of // Grandfathered in
    for (let i = 0; i < images.length; i++) {
        if (!images[i].RepoTags) {
            // dangling
            const item = createItem(images[i], '<none>:<none>');
            items.push(item);
        } else {
            // tslint:disable-next-line:prefer-for-of // Grandfathered in
            for (let j = 0; j < images[i].RepoTags.length; j++) {
                const item = createItem(images[i], images[i].RepoTags[j]);
                items.push(item);
            }
        }

    }

    if (includeAll && images.length > 0) {
        items.unshift(<ImageItem>{
            label: 'All images',
            allImages: true
        });
    }

    return items;
}

export async function quickPickImage(context: IActionContext, includeAll?: boolean): Promise<ImageItem> {
    let images: Docker.ImageDesc[];
    let properties: {
        allImages?: string;
    } & TelemetryProperties = context.telemetry.properties;

    const imageFilters = {
        "filters": {
            "dangling": ["false"]
        }
    };

    try {
        images = await docker.getImageDescriptors(imageFilters);
    } catch (error) {
        throwDockerConnectionError(context, error);
    }
    if (!images || images.length === 0) {
        throw new Error('There are no docker images. Try Docker Build first.');
    } else {
        const items: ImageItem[] = computeItems(images, includeAll);
        let response = await ext.ui.showQuickPick<ImageItem>(items, { placeHolder: 'Choose image...' });
        properties.allImages = includeAll ? String(response.allImages) : undefined;
        return response;
    }
}

export async function quickPickImageName(context: IActionContext, rootFolder: vscode.WorkspaceFolder, dockerFileItem: Item | undefined): Promise<string> {
    let absFilePath: string = path.join(rootFolder.uri.fsPath, dockerFileItem.relativeFilePath);
    let dockerFileKey = `ACR_buildTag_${absFilePath}`;
    let prevImageName: string | undefined = ext.context.globalState.get(dockerFileKey);
    let suggestedImageName: string;

    if (!prevImageName) {
        // Get imageName based on name of subfolder containing the Dockerfile, or else workspacefolder
        suggestedImageName = path.basename(dockerFileItem.relativeFolderPath).toLowerCase();
        if (suggestedImageName === '.') {
            suggestedImageName = path.basename(rootFolder.uri.fsPath).toLowerCase().replace(/\s/g, '');
        }

        suggestedImageName += ":{{.Run.ID}}"
    } else {
        suggestedImageName = prevImageName;
    }

    // Temporary work-around for vscode bug where valueSelection can be messed up if a quick pick is followed by a showInputBox
    await delay(500);

    addImageTaggingTelemetry(context, suggestedImageName, '.before');
    const imageName: string = await getTagFromUserInput(suggestedImageName, false);
    addImageTaggingTelemetry(context, imageName, '.after');

    await ext.context.globalState.update(dockerFileKey, imageName);
    return imageName;
}
