/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { commands } from "vscode";
import { IActionContext, parseError, registerCommand } from "vscode-azureextensionui";
import { configure, configureApi } from "../configureWorkspace/configure";
import { composeDown, composeRestart, composeUp } from "./compose";
import { attachShellContainer } from "./containers/attachShellContainer";
import { configureContainersExplorer } from "./containers/configureContainersExplorer";
import { inspectContainer } from "./containers/inspectContainer";
import { pruneContainers } from "./containers/pruneContainers";
import { removeContainer } from "./containers/removeContainer";
import { restartContainer } from "./containers/restartContainer";
import { startContainer } from "./containers/startContainer";
import { stopContainer } from "./containers/stopContainer";
import { viewContainerLogs } from "./containers/viewContainerLogs";
import { buildImage } from "./images/buildImage";
import { configureImagesExplorer } from "./images/configureImagesExplorer";
import { inspectImage } from "./images/inspectImage";
import { pruneImages } from "./images/pruneImages";
import { pushImage } from "./images/pushImage";
import { removeImage } from "./images/removeImage";
import { runAzureCliImage } from "./images/runAzureCliImage";
import { runImage, runImageInteractive } from "./images/runImage";
import { tagImage } from "./images/tagImage";
import { configureNetworksExplorer } from "./networks/configureNetworksExplorer";
import { inspectNetwork } from "./networks/inspectNetwork";
import { pruneNetworks } from "./networks/pruneNetworks";
import { removeNetwork } from "./networks/removeNetwork";
import { pruneSystem } from "./pruneSystem";
import { registerWorkspaceCommand } from "./registerWorkspaceCommand";
import { createAzureRegistry } from "./registries/azure/createAzureRegistry";
import { deleteAzureRegistry } from "./registries/azure/deleteAzureRegistry";
import { deleteAzureRepository } from "./registries/azure/deleteAzureRepository";
import { deployImageToAzure } from "./registries/azure/deployImageToAzure";
import { openInAzurePortal } from "./registries/azure/openInAzurePortal";
import { buildImageInAzure } from "./registries/azure/tasks/buildImageInAzure";
import { runAzureTask } from "./registries/azure/tasks/runAzureTask";
import { runFileAsAzureTask } from "./registries/azure/tasks/runFileAsAzureTask";
import { viewAzureTaskLogs } from "./registries/azure/tasks/viewAzureTaskLogs";
import { untagAzureImage } from "./registries/azure/untagAzureImage";
import { viewAzureProperties } from "./registries/azure/viewAzureProperties";
import { connectRegistry } from "./registries/connectRegistry";
import { copyRemoteImageDigest } from "./registries/copyRemoteImageDigest";
import { deleteRemoteImage } from "./registries/deleteRemoteImage";
import { disconnectRegistry } from "./registries/disconnectRegistry";
import { openDockerHubInBrowser } from "./registries/dockerHub/openDockerHubInBrowser";
import { logInToDockerCli } from "./registries/logInToDockerCli";
import { logOutOfDockerCli } from "./registries/logOutOfDockerCli";
import { pullImage, pullRepository } from "./registries/pullImages";
import { setRegistryAsDefault } from "./registries/registrySettings";
import { configureVolumesExplorer } from "./volumes/configureVolumesExplorer";
import { inspectVolume } from "./volumes/inspectVolume";
import { pruneVolumes } from "./volumes/pruneVolumes";
import { removeVolume } from "./volumes/removeVolume";

export function registerCommands(): void {
    registerInternal(true, 'vscode-docker.api.configure', configureApi);
    registerInternal(true, 'vscode-docker.compose.down', composeDown);
    registerInternal(true, 'vscode-docker.compose.restart', composeRestart);
    registerInternal(true, 'vscode-docker.compose.up', composeUp);
    registerInternal(true, 'vscode-docker.configure', configure);
    registerInternal(false, 'vscode-docker.pruneSystem', pruneSystem);

    registerInternal(true, 'vscode-docker.containers.attachShell', attachShellContainer);
    registerInternal(false, 'vscode-docker.containers.inspect', inspectContainer);
    registerInternal(false, 'vscode-docker.containers.configureExplorer', configureContainersExplorer);
    registerInternal(false, 'vscode-docker.containers.prune', pruneContainers);
    registerInternal(false, 'vscode-docker.containers.remove', removeContainer);
    registerInternal(false, 'vscode-docker.containers.restart', restartContainer);
    registerInternal(false, 'vscode-docker.containers.start', startContainer);
    registerInternal(false, 'vscode-docker.containers.stop', stopContainer);
    registerInternal(true, 'vscode-docker.containers.viewLogs', viewContainerLogs);

    registerInternal(true, 'vscode-docker.images.build', buildImage);
    registerInternal(false, 'vscode-docker.images.configureExplorer', configureImagesExplorer);
    registerInternal(false, 'vscode-docker.images.inspect', inspectImage);
    registerInternal(false, 'vscode-docker.images.prune', pruneImages);
    registerInternal(true, 'vscode-docker.images.push', pushImage);
    registerInternal(false, 'vscode-docker.images.remove', removeImage);
    registerInternal(true, 'vscode-docker.images.run', runImage);
    registerInternal(true, 'vscode-docker.images.runAzureCli', runAzureCliImage);
    registerInternal(true, 'vscode-docker.images.runInteractive', runImageInteractive);
    registerInternal(false, 'vscode-docker.images.tag', tagImage);

    registerInternal(false, 'vscode-docker.networks.configureExplorer', configureNetworksExplorer);
    registerInternal(false, 'vscode-docker.networks.inspect', inspectNetwork);
    registerInternal(false, 'vscode-docker.networks.remove', removeNetwork);
    registerInternal(false, 'vscode-docker.networks.prune', pruneNetworks);

    registerInternal(false, 'vscode-docker.registries.connectRegistry', connectRegistry);
    registerInternal(false, 'vscode-docker.registries.copyImageDigest', copyRemoteImageDigest);
    registerInternal(false, 'vscode-docker.registries.deleteImage', deleteRemoteImage);
    registerInternal(false, 'vscode-docker.registries.deployImageToAzure', deployImageToAzure);
    registerInternal(false, 'vscode-docker.registries.disconnectRegistry', disconnectRegistry);
    registerInternal(true, 'vscode-docker.registries.logInToDockerCli', logInToDockerCli);
    registerInternal(true, 'vscode-docker.registries.logOutOfDockerCli', logOutOfDockerCli);
    registerInternal(true, 'vscode-docker.registries.pullImage', pullImage);
    registerInternal(true, 'vscode-docker.registries.pullRepository', pullRepository);
    registerInternal(false, 'vscode-docker.registries.setAsDefault', setRegistryAsDefault);

    registerInternal(false, 'vscode-docker.registries.dockerHub.openInBrowser', openDockerHubInBrowser);

    registerInternal(true, 'vscode-docker.registries.azure.buildImage', buildImageInAzure);
    registerInternal(false, 'vscode-docker.registries.azure.createRegistry', createAzureRegistry);
    registerInternal(false, 'vscode-docker.registries.azure.deleteRegistry', deleteAzureRegistry);
    registerInternal(false, 'vscode-docker.registries.azure.deleteRepository', deleteAzureRepository);
    registerInternal(false, 'vscode-docker.registries.azure.openInPortal', openInAzurePortal);
    registerInternal(false, 'vscode-docker.registries.azure.runTask', runAzureTask);
    registerInternal(true, 'vscode-docker.registries.azure.runFileAsTask', runFileAsAzureTask);
    registerInternal(false, 'vscode-docker.registries.azure.selectSubscriptions', async () => await commands.executeCommand("azure-account.selectSubscriptions"));
    registerInternal(false, 'vscode-docker.registries.azure.untagImage', untagAzureImage);
    registerInternal(false, 'vscode-docker.registries.azure.viewProperties', viewAzureProperties);
    registerInternal(false, 'vscode-docker.registries.azure.viewTaskLogs', viewAzureTaskLogs);

    registerInternal(false, 'vscode-docker.volumes.configureExplorer', configureVolumesExplorer);
    registerInternal(false, 'vscode-docker.volumes.inspect', inspectVolume);
    registerInternal(false, 'vscode-docker.volumes.prune', pruneVolumes);
    registerInternal(false, 'vscode-docker.volumes.remove', removeVolume);
}

// tslint:disable-next-line: no-any
function registerInternal<T>(workspace: boolean, commandId: string, callback: (context: IActionContext, ...args: any[]) => T | PromiseLike<T>, debounce?: number): void {
    let registerFunction = workspace ? registerWorkspaceCommand : registerCommand;

    registerFunction(
        commandId,
        // tslint:disable-next-line: no-any
        async (context: IActionContext, ...args: any[]) => {
            try {
                return await Promise.resolve(callback(context, ...args));
            } catch (err) {
                const error = parseError(err);

                if (error && error.errorType === 'ENOENT') {
                    throw new Error(`Failed to connect. Is Docker installed and running? Error: ${error.message}`);
                }

                throw err;
            }
        },
        debounce
    );
}
