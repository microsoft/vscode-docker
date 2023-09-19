/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, NoResourceFoundError } from '@microsoft/vscode-azext-utils';
import { parseDockerLikeImageName } from '@microsoft/vscode-container-client';
import { CommonRegistry } from '@microsoft/vscode-docker-registries';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { TaskCommandRunnerFactory } from '../../runtimes/runners/TaskCommandRunnerFactory';
import { ImageTreeItem } from '../../tree/images/ImageTreeItem';
import { UnifiedRegistryItem } from '../../tree/registries/UnifiedRegistryTreeDataProvider';
import { registryExperience } from '../../utils/registryExperience';
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
                connectedRegistry = await registryExperience<CommonRegistry>(context, { contextValueFilter: { include: [/commonregistry/i] } });
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
            connectedRegistry = await registryExperience<CommonRegistry>(
                context,
                {
                    registryFilter: { include: [ext.dockerHubRegistryDataProvider.label] },
                    contextValueFilter: { include: /commonregistry/i },
                    skipIfOne: true
                }
            );
        }
    } else {
        // The registry to push to is determinate. If there's a connected registry in the tree view, we'll try to find it, to perform login ahead of time.
        // Registry path is everything up to the last slash.
        const progressOptions: vscode.ProgressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: vscode.l10n.t('Fetching login credentials...'),
        };

        connectedRegistry = await vscode.window.withProgress(progressOptions, async () => await tryGetConnectedRegistryForPath(context, node.parent.label));
    }

    // Give the user a chance to modify the tag however they want
    const finalTag = await tagImage(context, node, connectedRegistry);
    const baseImagePath = connectedRegistry.wrappedItem.baseUrl.authority;
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

async function tryGetConnectedRegistryForPath(context: IActionContext, baseImagePath: string): Promise<UnifiedRegistryItem<CommonRegistry> | undefined> {
    const baseImageNameInfo = parseDockerLikeImageName(baseImagePath);
    const allRegistries = await ext.registriesTree.getConnectedRegistries(baseImageNameInfo.registry);

    let matchedRegistry = allRegistries.find((registry) => registry.wrappedItem.baseUrl.authority === baseImageNameInfo.registry);

    if (!matchedRegistry) {
        matchedRegistry = await registryExperience<CommonRegistry>(context, { contextValueFilter: { include: [/commonregistry/i] } });
    }

    return matchedRegistry;
}
