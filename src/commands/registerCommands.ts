/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { commands } from "vscode";
import { registerCommand } from "vscode-azureextensionui";
import { configure, configureApi } from "../configureWorkspace/configure";
import { composeDown, composeRestart, composeUp } from "./compose";
import { attachShellContainer } from "./containers/attachShellContainer";
import { browseContainer } from "./containers/browseContainer";
import { configureContainersExplorer } from "./containers/configureContainersExplorer";
import { inspectContainer } from "./containers/inspectContainer";
import { pruneContainers } from "./containers/pruneContainers";
import { removeContainer } from "./containers/removeContainer";
import { restartContainer } from "./containers/restartContainer";
import { selectContainer } from "./containers/selectContainer";
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
import { createNetwork } from "./networks/createNetwork";
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
    registerWorkspaceCommand('vscode-docker.api.configure', configureApi);
    registerWorkspaceCommand('vscode-docker.compose.down', composeDown);
    registerWorkspaceCommand('vscode-docker.compose.restart', composeRestart);
    registerWorkspaceCommand('vscode-docker.compose.up', composeUp);
    registerWorkspaceCommand('vscode-docker.configure', configure);
    registerCommand('vscode-docker.pruneSystem', pruneSystem);

    registerWorkspaceCommand('vscode-docker.containers.attachShell', attachShellContainer);
    registerCommand('vscode-docker.containers.browse', browseContainer);
    registerCommand('vscode-docker.containers.inspect', inspectContainer);
    registerCommand('vscode-docker.containers.configureExplorer', configureContainersExplorer);
    registerCommand('vscode-docker.containers.prune', pruneContainers);
    registerCommand('vscode-docker.containers.remove', removeContainer);
    registerCommand('vscode-docker.containers.restart', restartContainer);
    registerCommand('vscode-docker.containers.select', selectContainer);
    registerCommand('vscode-docker.containers.start', startContainer);
    registerCommand('vscode-docker.containers.stop', stopContainer);
    registerWorkspaceCommand('vscode-docker.containers.viewLogs', viewContainerLogs);

    registerWorkspaceCommand('vscode-docker.images.build', buildImage);
    registerCommand('vscode-docker.images.configureExplorer', configureImagesExplorer);
    registerCommand('vscode-docker.images.inspect', inspectImage);
    registerCommand('vscode-docker.images.prune', pruneImages);
    registerWorkspaceCommand('vscode-docker.images.push', pushImage);
    registerCommand('vscode-docker.images.remove', removeImage);
    registerWorkspaceCommand('vscode-docker.images.run', runImage);
    registerWorkspaceCommand('vscode-docker.images.runAzureCli', runAzureCliImage);
    registerWorkspaceCommand('vscode-docker.images.runInteractive', runImageInteractive);
    registerCommand('vscode-docker.images.tag', tagImage);

    registerCommand('vscode-docker.networks.configureExplorer', configureNetworksExplorer);
    registerCommand('vscode-docker.networks.create', createNetwork);
    registerCommand('vscode-docker.networks.inspect', inspectNetwork);
    registerCommand('vscode-docker.networks.remove', removeNetwork);
    registerCommand('vscode-docker.networks.prune', pruneNetworks);

    registerCommand('vscode-docker.registries.connectRegistry', connectRegistry);
    registerCommand('vscode-docker.registries.copyImageDigest', copyRemoteImageDigest);
    registerCommand('vscode-docker.registries.deleteImage', deleteRemoteImage);
    registerCommand('vscode-docker.registries.deployImageToAzure', deployImageToAzure);
    registerCommand('vscode-docker.registries.disconnectRegistry', disconnectRegistry);
    registerWorkspaceCommand('vscode-docker.registries.logInToDockerCli', logInToDockerCli);
    registerWorkspaceCommand('vscode-docker.registries.logOutOfDockerCli', logOutOfDockerCli);
    registerWorkspaceCommand('vscode-docker.registries.pullImage', pullImage);
    registerWorkspaceCommand('vscode-docker.registries.pullRepository', pullRepository);
    registerCommand('vscode-docker.registries.setAsDefault', setRegistryAsDefault);

    registerCommand('vscode-docker.registries.dockerHub.openInBrowser', openDockerHubInBrowser);

    registerWorkspaceCommand('vscode-docker.registries.azure.buildImage', buildImageInAzure);
    registerCommand('vscode-docker.registries.azure.createRegistry', createAzureRegistry);
    registerCommand('vscode-docker.registries.azure.deleteRegistry', deleteAzureRegistry);
    registerCommand('vscode-docker.registries.azure.deleteRepository', deleteAzureRepository);
    registerCommand('vscode-docker.registries.azure.openInPortal', openInAzurePortal);
    registerCommand('vscode-docker.registries.azure.runTask', runAzureTask);
    registerWorkspaceCommand('vscode-docker.registries.azure.runFileAsTask', runFileAsAzureTask);
    registerCommand('vscode-docker.registries.azure.selectSubscriptions', () => commands.executeCommand("azure-account.selectSubscriptions"));
    registerCommand('vscode-docker.registries.azure.untagImage', untagAzureImage);
    registerCommand('vscode-docker.registries.azure.viewProperties', viewAzureProperties);
    registerCommand('vscode-docker.registries.azure.viewTaskLogs', viewAzureTaskLogs);

    registerCommand('vscode-docker.volumes.configureExplorer', configureVolumesExplorer);
    registerCommand('vscode-docker.volumes.inspect', inspectVolume);
    registerCommand('vscode-docker.volumes.prune', pruneVolumes);
    registerCommand('vscode-docker.volumes.remove', removeVolume);
}
