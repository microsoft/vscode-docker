/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { IActionContext } from 'vscode-azureextensionui';
import { configurationKeys } from '../../constants';
import { ext } from '../../extensionVariables';
import { ImageTreeItem } from '../../tree/images/ImageTreeItem';
import { askToSaveRegistryPath } from '../registries/registrySettings';
import { addImageTaggingTelemetry, tagImage } from './tagImage';

export async function pushImage(context: IActionContext, node: ImageTreeItem | undefined): Promise<void> {
    if (!node) {
        node = await ext.imagesTree.showTreeItemPicker<ImageTreeItem>(ImageTreeItem.contextValue, context);
    }

    const defaultRegistryPath = vscode.workspace.getConfiguration('docker').get(configurationKeys.defaultRegistryPath);

    let fullTag: string = node.fullTag;
    if (fullTag.includes('/')) {
        if (!defaultRegistryPath) {
            await askToSaveRegistryPath(fullTag);
        }
    } else {
        let askToPushPrefix: boolean = true;
        if (askToPushPrefix && defaultRegistryPath) {
            context.telemetry.properties.pushWithoutRepositoryAnswer = 'Cancel';

            let tagFirst: vscode.MessageItem = { title: "Tag first" };
            let pushAnyway: vscode.MessageItem = { title: "Push anyway" }
            let options: vscode.MessageItem[] = [tagFirst, pushAnyway];
            let response: vscode.MessageItem = await ext.ui.showWarningMessage(`This will attempt to push to the official public Docker Hub library (docker.io/library), which you may not have permissions for. To push to your own repository, you must tag the image like <docker-id-or-registry-server>/<imagename>`, ...options);
            context.telemetry.properties.pushWithoutRepositoryAnswer = response.title;

            if (response === tagFirst) {
                fullTag = await tagImage(context, node);
            }
        }
    }

    addImageTaggingTelemetry(context, fullTag, '');

    const terminal = ext.terminalProvider.createTerminal(fullTag);
    terminal.sendText(`docker push ${fullTag}`);
    terminal.show();
}
