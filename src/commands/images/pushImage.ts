/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, NoResourceFoundError } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ImageTreeItem } from '../../tree/images/ImageTreeItem';
import { registryExpectedContextValues } from '../../tree/registries/registryContextValues';
import { RegistryTreeItemBase } from '../../tree/registries/RegistryTreeItemBase';
import { executeAsTask } from '../../utils/executeAsTask';
import { addImageTaggingTelemetry, tagImage } from './tagImage';

export async function pushImage(context: IActionContext, node: ImageTreeItem | undefined): Promise<void> {
    if (!node) {
        await ext.imagesTree.refresh(context);
        node = await ext.imagesTree.showTreeItemPicker<ImageTreeItem>(ImageTreeItem.contextValue, {
            ...context,
            noItemFoundErrorMessage: localize('vscode-docker.commands.images.push.noImages', 'No images are available to push'),
        });
    }

    let connectedRegistry: RegistryTreeItemBase | undefined;

    if (!node.fullTag.includes('/')) {
        // The registry to push to is indeterminate--could be Docker Hub, or could need tagging.
        const prompt: boolean = vscode.workspace.getConfiguration('docker').get('promptForRegistryWhenPushingImages', true);

        // If the prompt setting is true, we'll ask; if not we'll assume Docker Hub.
        if (prompt) {
            try {
                connectedRegistry = await ext.registriesTree.showTreeItemPicker<RegistryTreeItemBase>(registryExpectedContextValues.all.registry, context);
            } catch (error) {
                if (error instanceof NoResourceFoundError) {
                    // Do nothing, move on without a selected registry
                } else {
                    // Rethrow
                    throw error;
                }
            }
        } else {
            // Try to find a connected Docker Hub registry (primarily for login credentials)
            connectedRegistry = await tryGetDockerHubRegistry(context);
        }
    } else {
        // The registry to push to is determinate. If there's a connected registry in the tree view, we'll try to find it, to perform login ahead of time.
        // Registry path is everything up to the last slash.
        const baseImagePath = node.fullTag.substring(0, node.fullTag.lastIndexOf('/'));

        const progressOptions: vscode.ProgressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: localize('vscode-docker.commands.images.push.fetchingCreds', 'Fetching login credentials...'),
        };

        connectedRegistry = await vscode.window.withProgress(progressOptions, async () => await tryGetConnectedRegistryForPath(context, baseImagePath));
    }

    // Give the user a chance to modify the tag however they want
    const finalTag = await tagImage(context, node, connectedRegistry);

    if (connectedRegistry && finalTag.startsWith(connectedRegistry.baseImagePath)) {
        // If a registry was found/chosen and is still the same as the final tag's registry, try logging in
        await vscode.commands.executeCommand('vscode-docker.registries.logInToDockerCli', connectedRegistry);
    }

    addImageTaggingTelemetry(context, finalTag, '');

    // Finally push the image
    await executeAsTask(context, `${ext.dockerContextManager.getDockerCommand(context)} push ${finalTag}`, finalTag, { addDockerEnv: true });
}

async function tryGetConnectedRegistryForPath(context: IActionContext, baseImagePath: string): Promise<RegistryTreeItemBase | undefined> {
    const allRegistries = await ext.registriesRoot.getAllConnectedRegistries(context);
    return allRegistries.find(r => r.baseImagePath === baseImagePath);
}

async function tryGetDockerHubRegistry(context: IActionContext): Promise<RegistryTreeItemBase | undefined> {
    const allRegistries = await ext.registriesRoot.getAllConnectedRegistries(context);
    return allRegistries.find(r => r.contextValue.match(registryExpectedContextValues.dockerHub.registry));
}
