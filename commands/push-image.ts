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
import { ImageItem, quickPickImage } from './utils/quick-pick-image';
const teleCmdId: string = 'vscode-docker.image.push';
const teleAzureId: string = 'vscode-docker.image.push.azureContainerRegistry';

export async function pushImage(context?: ImageNode): Promise<void> {
    let imageToPush: Docker.ImageDesc;
    let imageName: string = "";

    if (context && context.imageDesc) {
        imageToPush = context.imageDesc;
        imageName = context.label;
    } else {
        const selectedItem: ImageItem = await quickPickImage();
        if (selectedItem) {
            imageToPush = selectedItem.imageDesc;
            imageName = selectedItem.label;
        }
    }

    if (imageName.includes('/')) {
        await askToSavePrefix(imageName);
    } else {
        let addPrefixImagePush = "addPrefixImagePush";
        let askToPushPrefix: boolean = ext.context.workspaceState.get(addPrefixImagePush, true);
        if (askToPushPrefix) {
            let useDefaultRegistry: vscode.MessageItem = { title: "Use default registry path" };
            let response: vscode.MessageItem = await ext.ui.showWarningMessage(`You are about to push the image to dockerhub. You may not have permissions to push this image. Continue pushing to dockerhub?`, DialogResponses.yes, useDefaultRegistry, DialogResponses.dontWarnAgain);
            if (response === DialogResponses.dontWarnAgain) {
                ext.context.workspaceState.update(addPrefixImagePush, false);
            }
            if (response === useDefaultRegistry) {
                let defaultRegistryPath = vscode.workspace.getConfiguration('docker').get('defaultRegistryPath');
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
