/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { IActionContext, TelemetryProperties } from 'vscode-azureextensionui';
import { ImageNode } from '../explorer/models/imageNode';
import { RootNode } from '../explorer/models/rootNode';
import { configurationKeys } from '../src/constants';
import { ext } from '../src/extensionVariables';
import { askToSaveRegistryPath } from './registrySettings';
import { addImageTaggingTelemetry, getOrAskForImageAndTag, IHasImageDescriptorAndFullTag, tagImage } from './tag-image';

export async function pushImage(context: IActionContext, node: ImageNode | RootNode | undefined): Promise<void> {
    let properties: {
        pushWithoutRepositoryAnswer?: string;
    } & TelemetryProperties = context.telemetry.properties;

    let [imageToPush, imageName] = await getOrAskForImageAndTag(context, node instanceof RootNode ? undefined : node);

    if (imageName.includes('/')) {
        await askToSaveRegistryPath(imageName);
    } else {
        //let addPrefixImagePush = "addPrefixImagePush";
        let askToPushPrefix: boolean = true; // ext.context.workspaceState.get(addPrefixImagePush, true);
        let defaultRegistryPath = vscode.workspace.getConfiguration('docker').get(configurationKeys.defaultRegistryPath);
        if (askToPushPrefix && defaultRegistryPath) {
            properties.pushWithoutRepositoryAnswer = 'Cancel';

            // let alwaysPush: vscode.MessageItem = { title: "Always push" };
            let tagFirst: vscode.MessageItem = { title: "Tag first" };
            let pushAnyway: vscode.MessageItem = { title: "Push anyway" }
            let options: vscode.MessageItem[] = [tagFirst, pushAnyway];
            let response: vscode.MessageItem = await ext.ui.showWarningMessage(`This will attempt to push to the official public Docker Hub library (docker.io/library), which you may not have permissions for. To push to your own repository, you must tag the image like <docker-id-or-registry-server>/<imagename>`, ...options);
            properties.pushWithoutRepositoryAnswer = response.title;

            // if (response === alwaysPush) {
            //     ext.context.workspaceState.update(addPrefixImagePush, false);
            // }
            if (response === tagFirst) {
                imageName = await tagImage(context, <IHasImageDescriptorAndFullTag>{ imageDesc: imageToPush, fullTag: imageName }); //not passing this would ask the user a second time to pick an image
            }
        }
    }

    if (imageToPush) {
        addImageTaggingTelemetry(context, imageName, '');

        const terminal = ext.terminalProvider.createTerminal(imageName);
        terminal.sendText(`docker push ${imageName}`);
        terminal.show();
    }
}
