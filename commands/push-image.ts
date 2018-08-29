/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { DialogResponses, IActionContext, TelemetryProperties } from 'vscode-azureextensionui';
import { ImageNode } from '../explorer/models/imageNode';
import { ext } from '../extensionVariables';
import { ImageItem, quickPickImage } from './utils/quick-pick-image';

type RegistryType = 'gitlab' | 'Empty' | 'ACR' | 'Unknown' | 'localhost' | 'GCR' | 'ECR';

export async function pushImage(actionContext: IActionContext, node?: ImageNode): Promise<void> {
    let properties: {
        registryType?: RegistryType
    } & TelemetryProperties = actionContext.properties;

    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    let askToSaveRegistryPath: boolean = configOptions.get<boolean>('askToSaveRegistryPath');
    //asdf
    let prefix = "";
    let imageToPush: Docker.ImageDesc;
    let imageName: string = "";

    if (node && node.imageDesc) {
        imageToPush = node.imageDesc;
        imageName = node.label;
    } else {
        const selectedItem: ImageItem = await quickPickImage();
        imageToPush = selectedItem.imageDesc;
    }

    if (imageName.includes('/')) {
        prefix = imageName.substring(0, imageName.lastIndexOf('/'));
    }
    if (prefix && askToSaveRegistryPath !== false) { //account for undefined
        let userPrefixPreference: vscode.MessageItem = await ext.ui.showWarningMessage(`Would you like to save '${prefix}' as your default registry path?`, DialogResponses.yes, DialogResponses.no, DialogResponses.skipForNow);
        if (userPrefixPreference === DialogResponses.yes || userPrefixPreference === DialogResponses.no) {
            askToSaveRegistryPath = false;
            await configOptions.update('askToSaveRegistryPath', false, vscode.ConfigurationTarget.Workspace);
        }
        if (userPrefixPreference === DialogResponses.yes) {
            await configOptions.update('defaultRegistryPath', prefix, vscode.ConfigurationTarget.Workspace);
            vscode.window.showInformationMessage('Default registry path saved. You can change this value at any time via the docker.defaultRegistryPath setting.');
        }
    }

    if (imageName.indexOf('/') < 0) {
        properties.registryType = 'Empty';
    } else {
        let registry = imageName.toLowerCase().split('/')[0];
        properties.registryType = 'Unknown';
        const registryTypes: [string, RegistryType][] = [
            ['azurecr.io', 'ACR'],
            ['localhost', 'localhost'],
            ['gitlab', 'gitlab'],
            ['gcr.io', 'GCR'],
            ['.ecr.', 'ECR']
        ];
        let foundType = registryTypes.find(tuple => registry.includes(tuple[0]));
        if (foundType) {
            properties.registryType = foundType[1];
        }
    }

    const terminal = ext.terminalProvider.createTerminal(imageName);
    terminal.sendText(`docker push ${imageName}`);
    terminal.show();
}
