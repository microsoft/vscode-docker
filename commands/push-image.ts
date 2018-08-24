/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { DialogResponses } from 'vscode-azureextensionui';
import { ImageNode } from '../explorer/models/imageNode';
import { ext } from '../extensionVariables';
import { reporter } from '../telemetry/telemetry';
import { ImageItem, quickPickImage } from './utils/quick-pick-image';
const teleCmdId: string = 'vscode-docker.image.push';
const teleAzureId: string = 'vscode-docker.image.push.azureContainerRegistry';

export async function pushImage(context?: ImageNode): Promise<void> {
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    let askToSavePrefix = configOptions.get('askToSavePrefix', undefined);

    let prefix = "";
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
        prefix = imageName.substring(0, imageName.lastIndexOf('/'));
    }
    if (prefix && askToSavePrefix !== false) { //account for undefined
        let userPrefixPreference: vscode.MessageItem = await ext.ui.showWarningMessage("Would you like to save the prefix for autocomplete later?", DialogResponses.yes, DialogResponses.no, DialogResponses.skipForNow);
        if (userPrefixPreference === DialogResponses.yes || userPrefixPreference === DialogResponses.no) {
            askToSavePrefix = false;
        }
        if (userPrefixPreference === DialogResponses.yes) {
            await configOptions.update('defaultRegistryPath', prefix, vscode.ConfigurationTarget.Workspace);
        }
        await configOptions.update('askToSavePrefix', askToSavePrefix, vscode.ConfigurationTarget.Workspace);
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
