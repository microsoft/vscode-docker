/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as Docker from 'dockerode';
import * as path from "path";
import vscode = require('vscode');
import { DialogResponses, IActionContext, parseError, TelemetryProperties } from 'vscode-azureextensionui';
import { delay } from '../../explorer/utils/utils';
import { ext } from '../../extensionVariables';
import { FileType, Item, resolveFileItem } from '../build-image';
import { addImageTaggingTelemetry, getTagFromUserInput } from '../tag-image';
import { docker } from './docker-endpoint';

export interface ImageItem extends vscode.QuickPickItem {
    label: string;
    imageDesc: Docker.ImageDesc;
    allImages: boolean;
}

function createItem(image: Docker.ImageDesc, repoTag: string): ImageItem {
    return <ImageItem>{
        label: repoTag || '<none>',
        imageDesc: image
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
            label: 'All Images',
            allImages: true
        });
    }

    return items;
}

export async function quickPickImage(actionContext: IActionContext, includeAll?: boolean): Promise<ImageItem> {
    let images: Docker.ImageDesc[];
    let properties: {
        allImages?: boolean;
    } & TelemetryProperties = actionContext.properties;

    const imageFilters = {
        "filters": {
            "dangling": ["false"]
        }
    };

    try {
        images = await docker.getImageDescriptors(imageFilters);
    } catch (error) {
        (<{ message?: string }>error).message = 'Unable to connect to Docker, is the Docker daemon running?\nOutput from Docker: ' + parseError(error).message;
        throw error;
    }
    if (!images || images.length === 0) {
        throw new Error('There are no docker images. Try Docker Build first.');
    } else {
        const items: ImageItem[] = computeItems(images, includeAll);
        let response = await ext.ui.showQuickPick<ImageItem>(items, { placeHolder: 'Choose image...' });
        properties.allContainers = includeAll ? String(response.allImages) : undefined;
        return response;
    }
}

export async function quickPickImageName(actionContext: IActionContext, rootFolder: vscode.WorkspaceFolder, dockerFileItem: Item | undefined): Promise<string> {
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

    addImageTaggingTelemetry(actionContext, suggestedImageName, '.before');
    const imageName: string = await getTagFromUserInput(suggestedImageName, false);
    addImageTaggingTelemetry(actionContext, imageName, '.after');

    await ext.context.globalState.update(dockerFileKey, imageName);
    return imageName;
}

export async function quickPickDockerFileItem(actionContext: IActionContext, dockerFileUri: vscode.Uri | undefined, rootFolder: vscode.WorkspaceFolder): Promise<Item> {
    let dockerFileItem: Item;

    while (!dockerFileItem) {
        let resolvedItem: Item | undefined = await resolveFileItem(rootFolder, dockerFileUri, FileType.Dockerfile);
        if (resolvedItem) {
            dockerFileItem = resolvedItem;
        } else {
            let msg = "Couldn't find a Dockerfile in your workspace. Would you like to add Docker files to the workspace?";
            actionContext.properties.cancelStep = msg;
            await ext.ui.showWarningMessage(msg, DialogResponses.yes, DialogResponses.cancel);
            actionContext.properties.cancelStep = undefined;
            await vscode.commands.executeCommand('vscode-docker.configure');
            // Try again
        }
    }
    return dockerFileItem;
}

export async function quickPickYamlFileItem(fileUri: vscode.Uri | undefined, rootFolder: vscode.WorkspaceFolder): Promise<Item> {
    let fileItem: Item;

    let resolvedItem: Item | undefined = await resolveFileItem(rootFolder, fileUri, FileType.Yaml);
    if (resolvedItem) {
        fileItem = resolvedItem;
    }
    return fileItem;
}
