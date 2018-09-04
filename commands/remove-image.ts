/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { IActionContext } from 'vscode-azureextensionui';
import { dockerExplorerProvider } from '../dockerExtension';
import { ImageNode } from "../explorer/models/imageNode";
import { RootNode } from '../explorer/models/rootNode';
import { reporter } from '../telemetry/telemetry';
import { docker } from './utils/docker-endpoint';
import { ImageItem, quickPickImage } from './utils/quick-pick-image';

const teleCmdId: string = 'vscode-docker.image.remove';

export async function removeImage(actionContext: IActionContext, context: ImageNode | RootNode | undefined): Promise<void> {

    let imagesToRemove: Docker.ImageDesc[];

    if (context instanceof ImageNode && context.imageDesc) {
        imagesToRemove = [context.imageDesc];
    } else {
        const selectedItem: ImageItem = await quickPickImage(actionContext, true);
        if (selectedItem) {
            if (selectedItem.allImages) {
                imagesToRemove = await docker.getImageDescriptors();
            } else {
                imagesToRemove = [selectedItem.imageDesc];
            }
        }
    }

    if (imagesToRemove) {
        const numImages: number = imagesToRemove.length;
        let imageCounter: number = 0;

        vscode.window.setStatusBarMessage("Docker: Removing Image(s)...", new Promise((resolve, reject) => {
            imagesToRemove.forEach((img) => {
                // tslint:disable-next-line:no-function-expression // Grandfathered in
                docker.getImage(img.Id).remove({ force: true }, function (err: { message?: string }, data: any): void {
                    imageCounter++;
                    if (err) {
                        // TODO: use parseError, proper error handling
                        vscode.window.showErrorMessage(err.message);
                        reject();
                    }
                    if (imageCounter === numImages) {
                        resolve();
                    }
                });
            });
        }));
    }

    if (reporter) {
        /* __GDPR__
           "command" : {
              "command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
           }
         */
        reporter.sendTelemetryEvent('command', {
            command: teleCmdId
        });
    }
}
