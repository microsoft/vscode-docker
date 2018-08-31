/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { DialogResponses } from 'vscode-azureextensionui';
import { ImageNode } from '../explorer/models/imageNode';
import { ext } from '../extensionVariables';
import { reporter } from '../telemetry/telemetry';
import { askToSavePrefix } from './registrySettings';
import { contextToImageDescriptor, DockerodeImageDescriptor, tagImage } from './tag-image';
const teleCmdId: string = 'vscode-docker.image.push';
const teleAzureId: string = 'vscode-docker.image.push.azureContainerRegistry';

export async function pushImage(context?: ImageNode): Promise<void> {

    let descriptor = await contextToImageDescriptor(context);
    let imageToPush: Docker.ImageDesc = descriptor[0];
    let imageName: string = descriptor[1];

    if (imageName.includes('/')) {
        await askToSavePrefix(imageName);
    } else {
        let addPrefixImagePush = "addPrefixImagePush";
        let askToPushPrefix: boolean = ext.context.workspaceState.get(addPrefixImagePush, true);
        let defaultRegistryPath = vscode.workspace.getConfiguration('docker').get('defaultRegistryPath');
        if (askToPushPrefix && defaultRegistryPath) {
            let alwaysPush: vscode.MessageItem = { title: "Always Push" };
            let tagFirst: vscode.MessageItem = { title: "Tag first" };
            let options: vscode.MessageItem[] = [DialogResponses.yes, alwaysPush, tagFirst];
            let response: vscode.MessageItem = await ext.ui.showWarningMessage(`You are about to push the image to dockerhub. You may not have permissions to push this image. Continue pushing to dockerhub?`, ...options);
            if (response === alwaysPush) {
                ext.context.workspaceState.update(addPrefixImagePush, false);
            }
            if (response === tagFirst) {
                imageName = await tagImage(<DockerodeImageDescriptor>{ imageDesc: imageToPush, label: imageName }); //not passing this would ask the user a second time to pick an image
            }
        }
    }

    if (imageToPush) {
        const terminal = ext.terminalProvider.createTerminal(imageName);
        terminal.sendText(`docker push ${imageName}`);
        terminal.show();
        if (reporter) {
            /* __GDPR__
               "command" : {
                  "command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
               }
             */
            reporter.sendTelemetryEvent('command', {
                command: teleCmdId
            });

            if (imageName.toLowerCase().includes('azurecr.io')) {
                /* __GDPR__
                   "command" : {
                      "command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
                   }
                 */
                reporter.sendTelemetryEvent('command', {
                    command: teleAzureId
                });

            }
        }
    }
}
