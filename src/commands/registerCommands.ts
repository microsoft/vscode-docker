/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { commands } from "vscode";
import { IActionContext, registerCommand } from "vscode-azureextensionui";
import { configure, configureApi } from "../configureWorkspace/configure";
import { configureCompose } from "../configureWorkspace/configureCompose";
import { ext } from "../extensionVariables";
import { deployImageToAzure } from "../utils/lazyLoad";
import { viewAzureTaskLogs } from "../utils/lazyLoad";
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
import { configureDockerContextsExplorer, dockerContextsHelp, refreshDockerContexts } from "./context/DockerContextsViewCommands";
import { inspectDockerContext } from "./context/inspectDockerContext";
import { removeDockerContext } from "./context/removeDockerContext";
import { useDockerContext } from "./context/useDockerContext";
import { help } from "./help";
import { buildImage } from "./images/buildImage";
import { configureImagesExplorer } from "./images/configureImagesExplorer";
import { copyFullTag } from "./images/copyFullTag";
import { inspectImage } from "./images/inspectImage";
import { pruneImages } from "./images/pruneImages";
import { pullImage } from "./images/pullImage";
import { pushImage } from "./images/pushImage";
import { removeImage } from "./images/removeImage";
import { runAzureCliImage } from "./images/runAzureCliImage";
import { runImage, runImageInteractive } from "./images/runImage";
import { tagImage } from "./images/tagImage";
import { installDocker } from "./installDocker";
import { configureNetworksExplorer } from "./networks/configureNetworksExplorer";
import { createNetwork } from "./networks/createNetwork";
import { inspectNetwork } from "./networks/inspectNetwork";
import { pruneNetworks } from "./networks/pruneNetworks";
import { removeNetwork } from "./networks/removeNetwork";
import { pruneSystem } from "./pruneSystem";
import { registerLocalCommand } from "./registerLocalCommand";
import { registerWorkspaceCommand } from "./registerWorkspaceCommand";
import { createAzureRegistry } from "./registries/azure/createAzureRegistry";
import { deleteAzureRegistry } from "./registries/azure/deleteAzureRegistry";
import { deleteAzureRepository } from "./registries/azure/deleteAzureRepository";
import { openInAzurePortal } from "./registries/azure/openInAzurePortal";
import { buildImageInAzure } from "./registries/azure/tasks/buildImageInAzure";
import { runAzureTask } from "./registries/azure/tasks/runAzureTask";
import { runFileAsAzureTask } from "./registries/azure/tasks/runFileAsAzureTask";
import { untagAzureImage } from "./registries/azure/untagAzureImage";
import { viewAzureProperties } from "./registries/azure/viewAzureProperties";
import { connectRegistry } from "./registries/connectRegistry";
import { copyRemoteImageDigest } from "./registries/copyRemoteImageDigest";
import { deleteRemoteImage } from "./registries/deleteRemoteImage";
import { disconnectRegistry } from "./registries/disconnectRegistry";
import { openDockerHubInBrowser } from "./registries/dockerHub/openDockerHubInBrowser";
import { logInToDockerCli } from "./registries/logInToDockerCli";
import { logOutOfDockerCli } from "./registries/logOutOfDockerCli";
import { pullImageFromRepository, pullRepository } from "./registries/pullImages";
import { reconnectRegistry } from "./registries/reconnectRegistry";
import { registryHelp } from "./registries/registryHelp";
import { reportIssue } from "./reportIssue";
import { configureVolumesExplorer } from "./volumes/configureVolumesExplorer";
import { inspectVolume } from "./volumes/inspectVolume";
import { pruneVolumes } from "./volumes/pruneVolumes";
import { removeVolume } from "./volumes/removeVolume";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function registerCommandWithActivity(commandId: string, callback: (context: IActionContext, ...args: any[]) => any, debounce?: number): void {
    registerCommand(
        commandId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (context, ...args: any[]) => {
            // eslint-disable-next-line no-unused-expressions, @typescript-eslint/no-floating-promises
            ext.ams?.recordActivity('overallnoedit');

            return callback(context, ...args);
        },
        debounce
    );
}

export function registerCommands(): void {
    registerWorkspaceCommand('vscode-docker.api.configure', configureApi);
    registerWorkspaceCommand('vscode-docker.compose.down', composeDown);
    registerWorkspaceCommand('vscode-docker.compose.restart', composeRestart);
    registerWorkspaceCommand('vscode-docker.compose.up', composeUp);
    registerWorkspaceCommand('vscode-docker.configure', configure);
    registerWorkspaceCommand('vscode-docker.configureCompose', configureCompose);
    registerCommandWithActivity('vscode-docker.pruneSystem', pruneSystem);

    registerWorkspaceCommand('vscode-docker.containers.attachShell', attachShellContainer);
    registerCommandWithActivity('vscode-docker.containers.browse', browseContainer);
    registerCommandWithActivity('vscode-docker.containers.inspect', inspectContainer);
    registerCommandWithActivity('vscode-docker.containers.configureExplorer', configureContainersExplorer);
    registerCommandWithActivity('vscode-docker.containers.prune', pruneContainers);
    registerCommandWithActivity('vscode-docker.containers.remove', removeContainer);
    registerCommandWithActivity('vscode-docker.containers.restart', restartContainer);
    registerCommandWithActivity('vscode-docker.containers.select', selectContainer);
    registerCommandWithActivity('vscode-docker.containers.start', startContainer);
    registerCommandWithActivity('vscode-docker.containers.stop', stopContainer);
    registerWorkspaceCommand('vscode-docker.containers.viewLogs', viewContainerLogs);

    registerWorkspaceCommand('vscode-docker.images.build', buildImage);
    registerCommandWithActivity('vscode-docker.images.configureExplorer', configureImagesExplorer);
    registerCommandWithActivity('vscode-docker.images.inspect', inspectImage);
    registerCommandWithActivity('vscode-docker.images.prune', pruneImages);
    registerWorkspaceCommand('vscode-docker.images.pull', pullImage);
    registerWorkspaceCommand('vscode-docker.images.push', pushImage);
    registerCommandWithActivity('vscode-docker.images.remove', removeImage);
    registerWorkspaceCommand('vscode-docker.images.run', runImage);
    registerWorkspaceCommand('vscode-docker.images.runAzureCli', runAzureCliImage);
    registerWorkspaceCommand('vscode-docker.images.runInteractive', runImageInteractive);
    registerCommandWithActivity('vscode-docker.images.tag', tagImage);
    registerCommandWithActivity('vscode-docker.images.copyFullTag', copyFullTag);

    registerCommandWithActivity('vscode-docker.networks.configureExplorer', configureNetworksExplorer);
    registerCommandWithActivity('vscode-docker.networks.create', createNetwork);
    registerCommandWithActivity('vscode-docker.networks.inspect', inspectNetwork);
    registerCommandWithActivity('vscode-docker.networks.remove', removeNetwork);
    registerCommandWithActivity('vscode-docker.networks.prune', pruneNetworks);

    registerCommandWithActivity('vscode-docker.registries.connectRegistry', connectRegistry);
    registerCommandWithActivity('vscode-docker.registries.copyImageDigest', copyRemoteImageDigest);
    registerCommandWithActivity('vscode-docker.registries.deleteImage', deleteRemoteImage);
    registerCommandWithActivity('vscode-docker.registries.deployImageToAzure', deployImageToAzure);
    registerCommandWithActivity('vscode-docker.registries.disconnectRegistry', disconnectRegistry);
    registerCommandWithActivity('vscode-docker.registries.help', registryHelp);
    registerWorkspaceCommand('vscode-docker.registries.logInToDockerCli', logInToDockerCli);
    registerWorkspaceCommand('vscode-docker.registries.logOutOfDockerCli', logOutOfDockerCli);
    registerWorkspaceCommand('vscode-docker.registries.pullImage', pullImageFromRepository);
    registerWorkspaceCommand('vscode-docker.registries.pullRepository', pullRepository);
    registerCommandWithActivity('vscode-docker.registries.reconnectRegistry', reconnectRegistry);

    registerCommandWithActivity('vscode-docker.registries.dockerHub.openInBrowser', openDockerHubInBrowser);

    registerWorkspaceCommand('vscode-docker.registries.azure.buildImage', buildImageInAzure);
    registerCommandWithActivity('vscode-docker.registries.azure.createRegistry', createAzureRegistry);
    registerCommandWithActivity('vscode-docker.registries.azure.deleteRegistry', deleteAzureRegistry);
    registerCommandWithActivity('vscode-docker.registries.azure.deleteRepository', deleteAzureRepository);
    registerCommandWithActivity('vscode-docker.registries.azure.openInPortal', openInAzurePortal);
    registerCommandWithActivity('vscode-docker.registries.azure.runTask', runAzureTask);
    registerWorkspaceCommand('vscode-docker.registries.azure.runFileAsTask', runFileAsAzureTask);
    registerCommandWithActivity('vscode-docker.registries.azure.selectSubscriptions', () => commands.executeCommand("azure-account.selectSubscriptions"));
    registerCommandWithActivity('vscode-docker.registries.azure.untagImage', untagAzureImage);
    registerCommandWithActivity('vscode-docker.registries.azure.viewProperties', viewAzureProperties);
    registerCommandWithActivity('vscode-docker.registries.azure.viewTaskLogs', viewAzureTaskLogs);

    registerCommandWithActivity('vscode-docker.volumes.configureExplorer', configureVolumesExplorer);
    registerCommandWithActivity('vscode-docker.volumes.inspect', inspectVolume);
    registerCommandWithActivity('vscode-docker.volumes.prune', pruneVolumes);
    registerCommandWithActivity('vscode-docker.volumes.remove', removeVolume);

    registerCommandWithActivity('vscode-docker.contexts.configureExplorer', configureDockerContextsExplorer);
    registerCommandWithActivity('vscode-docker.contexts.help', dockerContextsHelp);
    registerCommandWithActivity('vscode-docker.contexts.inspect', inspectDockerContext);
    registerCommandWithActivity('vscode-docker.contexts.refresh', refreshDockerContexts);
    registerCommandWithActivity('vscode-docker.contexts.remove', removeDockerContext);
    registerCommandWithActivity('vscode-docker.contexts.use', useDockerContext);

    registerLocalCommand('vscode-docker.installDocker', installDocker);

    registerCommandWithActivity('vscode-docker.help', help);
    registerCommandWithActivity('vscode-docker.help.reportIssue', reportIssue);
}
