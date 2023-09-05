/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, NoResourceFoundError, contextValueExperience } from '@microsoft/vscode-azext-utils';
import { CommonRegistry, isGitHubRegistry } from '@microsoft/vscode-docker-registries';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { TaskCommandRunnerFactory } from '../../runtimes/runners/TaskCommandRunnerFactory';
import { ImageTreeItem } from '../../tree/images/ImageTreeItem';
import { UnifiedRegistryItem } from '../../tree/registries/UnifiedRegistryTreeDataProvider';
import { getBaseImagePathFromRegistry } from '../../tree/registries/registryTreeUtils';
import { addImageTaggingTelemetry, tagImage } from './tagImage';

export async function pushImage(context: IActionContext, node: ImageTreeItem | undefined): Promise<void> {
    if (!node) {
        await ext.imagesTree.refresh(context);
        node = await ext.imagesTree.showTreeItemPicker<ImageTreeItem>(ImageTreeItem.contextValue, {
            ...context,
            noItemFoundErrorMessage: vscode.l10n.t('No images are available to push'),
        });
    }

    let connectedRegistry: UnifiedRegistryItem<CommonRegistry> | undefined;

    if (!node.fullTag.includes('/')) {
        // The registry to push to is indeterminate--could be Docker Hub, or could need tagging.
        const prompt: boolean = vscode.workspace.getConfiguration('docker').get('promptForRegistryWhenPushingImages', true);

        // If the prompt setting is true, we'll ask; if not we'll assume Docker Hub.
        if (prompt) {
            try {
                connectedRegistry = await contextValueExperience(context, ext.registriesTree, { include: ['commonregistry'] });
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
            connectedRegistry = await contextValueExperience(context, ext.dockerHubRegistryDataProvider, { include: ['dockerHubRegistry'] });
        }
    } else {
        // The registry to push to is determinate. If there's a connected registry in the tree view, we'll try to find it, to perform login ahead of time.

        const progressOptions: vscode.ProgressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: vscode.l10n.t('Fetching login credentials...'),
        };

        connectedRegistry = await vscode.window.withProgress(progressOptions, async () => await tryGetConnectedRegistryForPath(context, node));
    }

    // Give the user a chance to modify the tag however they want
    const finalTag = await tagImage(context, node, connectedRegistry);
    const baseImagePath = getBaseImagePathFromRegistry(connectedRegistry.wrappedItem);
    if (connectedRegistry && finalTag.startsWith(baseImagePath)) {
        // If a registry was found/chosen and is still the same as the final tag's registry, try logging in
        await vscode.commands.executeCommand('vscode-docker.registries.logInToDockerCli', connectedRegistry);
    }

    addImageTaggingTelemetry(context, finalTag, '');

    const client = await ext.runtimeManager.getClient();
    const taskCRF = new TaskCommandRunnerFactory(
        {
            taskName: finalTag
        }
    );

    await taskCRF.getCommandRunner()(
        client.pushImage({ imageRef: finalTag })
    );
}

async function tryGetConnectedRegistryForPath(context: IActionContext, imageItem: ImageTreeItem): Promise<UnifiedRegistryItem<CommonRegistry> | undefined> {
    const allRegistries = await ext.registriesTree.getConnectedRegistries(imageItem.parent.label);
    const baseImagePath = imageItem.fullTag.substring(0, imageItem.fullTag.lastIndexOf('/'));

    let matchedRegistry = allRegistries.find((registry) => getFullRegistryPath(registry.wrappedItem) === baseImagePath);
    if (!matchedRegistry) {
        matchedRegistry = await contextValueExperience(context, ext.registriesTree, { include: ['commonregistry'] });
    }

    return matchedRegistry;
}

function getFullRegistryPath(registry: CommonRegistry): string {
    let fullRegistryName = getBaseImagePathFromRegistry(registry);

    // If it's a GitHub registry, we need to add the owner name to the path
    if (isGitHubRegistry(registry)) {
        fullRegistryName = `${fullRegistryName}/${registry.label}`;
    }
    return fullRegistryName;
}
