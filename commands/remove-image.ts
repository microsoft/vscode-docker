/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import vscode = require('vscode');
import { UserCancelledError } from 'vscode-azureextensionui';
import { ImageNode } from "../explorer/models/imageNode";
import { docker } from './utils/docker-endpoint';
import { ImageItem, quickPickImage } from './utils/quick-pick-image';

export async function removeImage(context?: ImageNode): Promise<void> {
    let imagesToRemove: Docker.ImageDesc[]; //asdf

    if (context && context.imageDesc) {
        imagesToRemove = [context.imageDesc];
    } else {
        const selectedItem: ImageItem = await quickPickImage(true);
        if (selectedItem.label.toLowerCase().includes('all containers')) {
            imagesToRemove = await docker.getImageDescriptors();
        } else {
            imagesToRemove = [selectedItem.imageDesc];
        }
    }

    if (imagesToRemove.length) {
        const numImages: number = imagesToRemove.length;
        let imageCounter: number = 0;

        vscode.window.setStatusBarMessage("Docker: Removing Image(s)...", new Promise((resolve, reject) => {
            imagesToRemove.forEach((img) => {
                // tslint:disable-next-line:no-function-expression // Grandfathered in
                docker.getImage(img.Id).remove({ force: true }, function (err: { message?: string }, data: any): void {
                    imageCounter++;
                    if (err) {
                        reject(err);
                    } else if (imageCounter === numImages) {
                        resolve();
                    } else {
                        reject(new Error('An error occurred while removing an image'));
                    }
                });
            });
        }));
    } else {
        throw new UserCancelledError();
    }
}
