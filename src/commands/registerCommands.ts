/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, registerCommand as registerCommandAzUI } from "@microsoft/vscode-azext-utils";
import { commands } from "vscode";
import { ext } from "../extensionVariables";
import { scaffold } from "../scaffolding/scaffold";
import { scaffoldCompose } from "../scaffolding/scaffoldCompose";
import { scaffoldDebugConfig } from "../scaffolding/scaffoldDebugConfig";
import { composeDown, composeRestart, composeUp, composeUpSubset } from "./compose/compose";
import { attachShellContainer } from "./containers/attachShellContainer";
import { browseContainer } from "./containers/browseContainer";
import { composeGroupDown, composeGroupLogs, composeGroupRestart, composeGroupStart, composeGroupStop } from "./containers/composeGroup";
import { configureContainersExplorer } from "./containers/configureContainersExplorer";
import { downloadContainerFile } from "./containers/files/downloadContainerFile";
import { openContainerFile } from "./containers/files/openContainerFile";
import { inspectContainer } from "./containers/inspectContainer";
import { pruneContainers } from "./containers/pruneContainers";
import { removeContainer } from "./containers/removeContainer";
import { restartContainer } from "./containers/restartContainer";
import { selectContainer } from "./containers/selectContainer";
import { startContainer } from "./containers/startContainer";
import { stats } from "./containers/stats";
import { stopContainer } from "./containers/stopContainer";
import { viewContainerLogs } from "./containers/viewContainerLogs";
import { createAciContext } from "./context/aci/createAciContext";
import { configureDockerContextsExplorer, dockerContextsHelp } from "./context/DockerContextsViewCommands";
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
import { hideDanglingImages, setInitialDanglingContextValue, showDanglingImages } from "./images/showDanglingImages";
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
import { deployImageToAci } from "./registries/azure/deployImageToAci";
import { deployImageToAzure } from "./registries/azure/deployImageToAzure";
import { openInAzurePortal } from "./registries/azure/openInAzurePortal";
import { buildImageInAzure } from "./registries/azure/tasks/buildImageInAzure";
import { runAzureTask } from "./registries/azure/tasks/runAzureTask";
import { runFileAsAzureTask } from "./registries/azure/tasks/runFileAsAzureTask";
import { viewAzureTaskLogs } from "./registries/azure/tasks/viewAzureTaskLogs";
import { untagAzureImage } from "./registries/azure/untagAzureImage";
import { viewAzureProperties } from "./registries/azure/viewAzureProperties";
import { connectRegistry } from "./registries/connectRegistry";
import { copyRemoteFullTag } from './registries/copyRemoteFullTag';
import { copyRemoteImageDigest } from "./registries/copyRemoteImageDigest";
import { deleteRemoteImage } from "./registries/deleteRemoteImage";
import { disconnectRegistry } from "./registries/disconnectRegistry";
import { openDockerHubInBrowser } from "./registries/dockerHub/openDockerHubInBrowser";
import { logInToDockerCli } from "./registries/logInToDockerCli";
import { logOutOfDockerCli } from "./registries/logOutOfDockerCli";
import { pullImageFromRepository, pullRepository } from "./registries/pullImages";
import { reconnectRegistry } from "./registries/reconnectRegistry";
import { registryHelp } from "./registries/registryHelp";
import { configureVolumesExplorer } from "./volumes/configureVolumesExplorer";
import { inspectVolume } from "./volumes/inspectVolume";
import { pruneVolumes } from "./volumes/pruneVolumes";
import { removeVolume } from "./volumes/removeVolume";

interface CommandReasonArgument {
    commandReason: 'tree' | 'palette' | 'install';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerCommand(commandId: string, callback: (context: IActionContext, ...args: any[]) => any, debounce?: number): void {
    registerCommandAzUI(
        commandId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (context, ...args: any[]) => {
            void ext.activityMeasurementService.recordActivity('overallnoedit');

            // If a command reason is given, record it. Currently only the start page provides the reason.
            const commandReasonArgIndex = args.findIndex(a => (<CommandReasonArgument>a)?.commandReason);
            if (commandReasonArgIndex >= 0) {
                const commandReason = (<CommandReasonArgument>args[commandReasonArgIndex]).commandReason;
                context.telemetry.properties.commandReason = commandReason;
                if (commandReason === 'install') {
                    context.telemetry.properties.isActivationEvent = 'true';
                }

                // Remove the reason argument from the list to prevent confusing the command
                args.splice(commandReasonArgIndex, 1);
            }

            return callback(context, ...args);
        },
        debounce
    );
}

export function registerCommands(): void {
    registerWorkspaceCommand('vscode-docker.configure', scaffold);
    registerWorkspaceCommand('vscode-docker.configureCompose', scaffoldCompose);
    registerWorkspaceCommand('vscode-docker.debugging.initializeForDebugging', scaffoldDebugConfig);

    registerWorkspaceCommand('vscode-docker.compose.down', composeDown);
    registerWorkspaceCommand('vscode-docker.compose.restart', composeRestart);
    registerWorkspaceCommand('vscode-docker.compose.up', composeUp);
    registerWorkspaceCommand('vscode-docker.compose.up.subset', composeUpSubset);
    registerCommand('vscode-docker.pruneSystem', pruneSystem);

    registerWorkspaceCommand('vscode-docker.containers.attachShell', attachShellContainer);
    registerCommand('vscode-docker.containers.browse', browseContainer);
    registerCommand('vscode-docker.containers.downloadFile', downloadContainerFile);
    registerCommand('vscode-docker.containers.inspect', inspectContainer);
    registerCommand('vscode-docker.containers.configureExplorer', configureContainersExplorer);
    registerCommand('vscode-docker.containers.openFile', openContainerFile);
    registerCommand('vscode-docker.containers.prune', pruneContainers);
    registerCommand('vscode-docker.containers.remove', removeContainer);
    registerCommand('vscode-docker.containers.restart', restartContainer);
    registerCommand('vscode-docker.containers.select', selectContainer);
    registerCommand('vscode-docker.containers.start', startContainer);
    registerCommand('vscode-docker.containers.stop', stopContainer);
    registerWorkspaceCommand('vscode-docker.containers.stats', stats);
    registerWorkspaceCommand('vscode-docker.containers.viewLogs', viewContainerLogs);
    registerWorkspaceCommand('vscode-docker.containers.composeGroup.logs', composeGroupLogs);
    registerWorkspaceCommand('vscode-docker.containers.composeGroup.start', composeGroupStart);
    registerWorkspaceCommand('vscode-docker.containers.composeGroup.stop', composeGroupStop);
    registerWorkspaceCommand('vscode-docker.containers.composeGroup.restart', composeGroupRestart);
    registerWorkspaceCommand('vscode-docker.containers.composeGroup.down', composeGroupDown);

    registerWorkspaceCommand('vscode-docker.images.build', buildImage);
    registerCommand('vscode-docker.images.configureExplorer', configureImagesExplorer);
    registerCommand('vscode-docker.images.inspect', inspectImage);
    registerCommand('vscode-docker.images.prune', pruneImages);
    registerCommand('vscode-docker.images.showDangling', showDanglingImages);
    registerCommand('vscode-docker.images.hideDangling', hideDanglingImages);
    setInitialDanglingContextValue();
    registerWorkspaceCommand('vscode-docker.images.pull', pullImage);
    registerWorkspaceCommand('vscode-docker.images.push', pushImage);
    registerCommand('vscode-docker.images.remove', removeImage);
    registerWorkspaceCommand('vscode-docker.images.run', runImage);
    registerWorkspaceCommand('vscode-docker.images.runAzureCli', runAzureCliImage);
    registerWorkspaceCommand('vscode-docker.images.runInteractive', runImageInteractive);
    registerCommand('vscode-docker.images.tag', tagImage);
    registerCommand('vscode-docker.images.copyFullTag', copyFullTag);

    registerCommand('vscode-docker.networks.configureExplorer', configureNetworksExplorer);
    registerCommand('vscode-docker.networks.create', createNetwork);
    registerCommand('vscode-docker.networks.inspect', inspectNetwork);
    registerCommand('vscode-docker.networks.remove', removeNetwork);
    registerCommand('vscode-docker.networks.prune', pruneNetworks);

    registerCommand('vscode-docker.registries.connectRegistry', connectRegistry);
    registerCommand('vscode-docker.registries.copyImageDigest', copyRemoteImageDigest);
    registerCommand('vscode-docker.registries.copyRemoteFullTag', copyRemoteFullTag);
    registerCommand('vscode-docker.registries.deleteImage', deleteRemoteImage);
    registerCommand('vscode-docker.registries.deployImageToAzure', deployImageToAzure);
    registerCommand('vscode-docker.registries.deployImageToAci', deployImageToAci);
    registerCommand('vscode-docker.registries.disconnectRegistry', disconnectRegistry);
    registerCommand('vscode-docker.registries.help', registryHelp);
    registerWorkspaceCommand('vscode-docker.registries.logInToDockerCli', logInToDockerCli);
    registerWorkspaceCommand('vscode-docker.registries.logOutOfDockerCli', logOutOfDockerCli);
    registerWorkspaceCommand('vscode-docker.registries.pullImage', pullImageFromRepository);
    registerWorkspaceCommand('vscode-docker.registries.pullRepository', pullRepository);
    registerCommand('vscode-docker.registries.reconnectRegistry', reconnectRegistry);

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

    registerCommand('vscode-docker.contexts.configureExplorer', configureDockerContextsExplorer);
    registerCommand('vscode-docker.contexts.help', dockerContextsHelp);
    registerCommand('vscode-docker.contexts.inspect', inspectDockerContext);
    registerCommand('vscode-docker.contexts.remove', removeDockerContext);
    registerCommand('vscode-docker.contexts.use', useDockerContext);
    registerCommand('vscode-docker.contexts.create.aci', createAciContext);

    registerLocalCommand('vscode-docker.installDocker', installDocker);

    registerCommand('vscode-docker.help', help);
    registerCommand('vscode-docker.help.openWalkthrough', () => commands.executeCommand('workbench.action.openWalkthrough', 'ms-azuretools.vscode-docker#dockerStart'));
}
