/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { commands } from "vscode";
import { IActionContext, registerCommand } from "vscode-azureextensionui";
import { configure, configureApi } from "../configureWorkspace/configure";
import { ext } from "../extensionVariables";
import { composeDown, composeRestart, composeUp } from "./compose";
import { attachShellContainer } from "./containers/attachShellContainer";
import { pruneContainers } from "./containers/pruneContainers";
import { removeContainer } from "./containers/removeContainer";
import { restartContainer } from "./containers/restartContainer";
import { startContainer } from "./containers/startContainer";
import { stopContainer } from "./containers/stopContainer";
import { viewContainerLogs } from "./containers/viewContainerLogs";
import { buildImage } from "./images/buildImage";
import { groupImagesBy } from "./images/groupImagesBy";
import { inspectImage } from "./images/inspectImage";
import { pruneImages } from "./images/pruneImages";
import { pushImage } from "./images/pushImage";
import { removeImage } from "./images/removeImage";
import { runAzureCliImage } from "./images/runAzureCliImage";
import { runImage, runImageInteractive } from "./images/runImage";
import { tagImage } from "./images/tagImage";
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
import { copyRemoteImageDigest } from "./registries/copyRemoteImageDigest";
import { deleteRemoteImage } from "./registries/deleteRemoteImage";
import { openDockerHubInBrowser } from "./registries/dockerHub/openDockerHubInBrowser";
import { logInToDockerCli } from "./registries/logInToDockerCli";
import { logOutOfDockerCli } from "./registries/logOutOfDockerCli";
import { connectPrivateRegistry } from "./registries/private/connectPrivateRegistry";
import { disconnectPrivateRegistry } from "./registries/private/disconnectPrivateRegistry";
import { pullImage, pullRepository } from "./registries/pullImages";
import { setRegistryAsDefault } from "./registries/registrySettings";
import { systemPrune } from "./systemPrune";

export function registerCommands(): void {
    registerCommand('vscode-docker.api.configure', configureApi);
    registerCommand('vscode-docker.compose.down', composeDown);
    registerCommand('vscode-docker.compose.restart', composeRestart);
    registerCommand('vscode-docker.compose.up', composeUp);
    registerCommand('vscode-docker.configure', configure);
    registerCommand('vscode-docker.system.prune', systemPrune);

    registerCommand('vscode-docker.containers.attachShell', attachShellContainer);
    registerCommand('vscode-docker.containers.prune', pruneContainers);
    registerCommand('vscode-docker.containers.remove', removeContainer);
    registerCommand('vscode-docker.containers.restart', restartContainer);
    registerCommand('vscode-docker.containers.start', startContainer);
    registerCommand('vscode-docker.containers.stop', stopContainer);
    registerCommand('vscode-docker.containers.viewLogs', viewContainerLogs);

    registerCommand('vscode-docker.images.build', buildImage);
    registerCommand('vscode-docker.images.groupBy', groupImagesBy);
    registerCommand('vscode-docker.images.inspect', inspectImage);
    registerCommand('vscode-docker.images.prune', pruneImages);
    registerCommand('vscode-docker.images.push', pushImage);
    registerCommand('vscode-docker.images.remove', removeImage);
    registerCommand('vscode-docker.images.run', runImage);
    registerCommand('vscode-docker.images.runAzureCli', runAzureCliImage);
    registerCommand('vscode-docker.images.runInteractive', runImageInteractive);
    registerCommand('vscode-docker.images.tag', tagImage);

    registerCommand('vscode-docker.registries.copyImageDigest', copyRemoteImageDigest);
    registerCommand('vscode-docker.registries.deleteImage', deleteRemoteImage);
    registerCommand('vscode-docker.registries.deployImageToAzure', deployImageToAzure);
    registerCommand('vscode-docker.registries.logInToDockerCli', logInToDockerCli);
    registerCommand('vscode-docker.registries.logOutOfDockerCli', logOutOfDockerCli);
    registerCommand('vscode-docker.registries.pullImage', pullImage);
    registerCommand('vscode-docker.registries.pullRepository', pullRepository);
    registerCommand('vscode-docker.registries.setAsDefault', setRegistryAsDefault);

    registerCommand('vscode-docker.registries.dockerHub.logIn', (context: IActionContext) => ext.dockerHubAccountTreeItem.logIn(context));
    registerCommand('vscode-docker.registries.dockerHub.logOut', () => ext.dockerHubAccountTreeItem.logOut());
    registerCommand('vscode-docker.registries.dockerHub.openInBrowser', openDockerHubInBrowser);

    registerCommand('vscode-docker.registries.azure.buildImage', buildImageInAzure);
    registerCommand('vscode-docker.registries.azure.createRegistry', createAzureRegistry);
    registerCommand('vscode-docker.registries.azure.deleteRegistry', deleteAzureRegistry);
    registerCommand('vscode-docker.registries.azure.deleteRepository', deleteAzureRepository);
    registerCommand('vscode-docker.registries.azure.openInPortal', openInAzurePortal);
    registerCommand('vscode-docker.registries.azure.runTask', runAzureTask);
    registerCommand('vscode-docker.registries.azure.runFileAsTask', runFileAsAzureTask);
    registerCommand('vscode-docker.registries.azure.selectSubscriptions', () => commands.executeCommand("azure-account.selectSubscriptions"));
    registerCommand('vscode-docker.registries.azure.untagImage', untagAzureImage);
    registerCommand('vscode-docker.registries.azure.viewProperties', viewAzureProperties);
    registerCommand('vscode-docker.registries.azure.viewTaskLogs', viewAzureTaskLogs);

    registerCommand('vscode-docker.registries.private.connectRegistry', connectPrivateRegistry);
    registerCommand('vscode-docker.registries.private.disconnectRegistry', disconnectPrivateRegistry);
}
