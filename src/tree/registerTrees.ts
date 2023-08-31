/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeDataProvider, AzExtTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { DockerHubRegistryDataProvider, GenericRegistryV2DataProvider, GitHubRegistryDataProvider } from "@microsoft/vscode-docker-registries";
import * as vscode from 'vscode';
import { registerCommand } from '../commands/registerCommands';
import { ext } from '../extensionVariables';
import { OpenUrlTreeItem } from './OpenUrlTreeItem';
import { RefreshManager } from './RefreshManager';
import { ContainersTreeItem } from './containers/ContainersTreeItem';
import { ContextsTreeItem } from './contexts/ContextsTreeItem';
import { HelpsTreeItem } from './help/HelpsTreeItem';
import { ImagesTreeItem } from "./images/ImagesTreeItem";
import { NetworksTreeItem } from "./networks/NetworksTreeItem";
import { AzureRegistryDataProvider } from "./registries/Azure/AzureRegistryDataProvider";
import { UnifiedRegistryTreeDataProvider } from "./registries/UnifiedRegistryTreeDataProvider";
import { VolumesTreeItem } from "./volumes/VolumesTreeItem";

export function registerTrees(): void {
    ext.containersRoot = new ContainersTreeItem(undefined);
    const containersLoadMore = 'vscode-docker.containers.loadMore';
    ext.containersTree = new AzExtTreeDataProvider(ext.containersRoot, containersLoadMore);
    ext.containersTreeView = vscode.window.createTreeView('dockerContainers', { treeDataProvider: ext.containersTree, canSelectMany: true });
    ext.context.subscriptions.push(ext.containersTreeView);
    /* eslint-disable-next-line @typescript-eslint/promise-function-async */
    registerCommand(containersLoadMore, (context: IActionContext, node: AzExtTreeItem) => ext.containersTree.loadMore(node, context));

    ext.networksRoot = new NetworksTreeItem(undefined);
    const networksLoadMore = 'vscode-docker.networks.loadMore';
    ext.networksTree = new AzExtTreeDataProvider(ext.networksRoot, networksLoadMore);
    ext.networksTreeView = vscode.window.createTreeView('dockerNetworks', { treeDataProvider: ext.networksTree, canSelectMany: true });
    ext.context.subscriptions.push(ext.networksTreeView);
    /* eslint-disable-next-line @typescript-eslint/promise-function-async */
    registerCommand(networksLoadMore, (context: IActionContext, node: AzExtTreeItem) => ext.networksTree.loadMore(node, context));

    ext.imagesRoot = new ImagesTreeItem(undefined);
    const imagesLoadMore = 'vscode-docker.images.loadMore';
    ext.imagesTree = new AzExtTreeDataProvider(ext.imagesRoot, imagesLoadMore);
    ext.imagesTreeView = vscode.window.createTreeView('dockerImages', { treeDataProvider: ext.imagesTree, canSelectMany: true });
    ext.context.subscriptions.push(ext.imagesTreeView);
    /* eslint-disable-next-line @typescript-eslint/promise-function-async */
    registerCommand(imagesLoadMore, (context: IActionContext, node: AzExtTreeItem) => ext.imagesTree.loadMore(node, context));

    const urtdp = new UnifiedRegistryTreeDataProvider(ext.context.globalState);
    const genericRegistryV2DataProvider = new GenericRegistryV2DataProvider(ext.context);
    const azureRegistryDataProvider = new AzureRegistryDataProvider(ext.context);
    const dockerHubRegistryDataProvider = new DockerHubRegistryDataProvider(ext.context);
    urtdp.registerProvider(new GitHubRegistryDataProvider(ext.context));
    urtdp.registerProvider(dockerHubRegistryDataProvider);
    urtdp.registerProvider(azureRegistryDataProvider);
    urtdp.registerProvider(genericRegistryV2DataProvider);
    ext.registriesRoot = urtdp;
    ext.registriesTreeView = vscode.window.createTreeView('dockerRegistries', { treeDataProvider: urtdp });
    ext.registriesTree = urtdp;
    ext.genericRegistryV2DataProvider = genericRegistryV2DataProvider;
    ext.azureRegistryDataProvider = azureRegistryDataProvider;
    ext.dockerHubRegistryDataProvider = dockerHubRegistryDataProvider;

    ext.volumesRoot = new VolumesTreeItem(undefined);
    const volumesLoadMore = 'vscode-docker.volumes.loadMore';
    ext.volumesTree = new AzExtTreeDataProvider(ext.volumesRoot, volumesLoadMore);
    ext.volumesTreeView = vscode.window.createTreeView('dockerVolumes', { treeDataProvider: ext.volumesTree, canSelectMany: true });
    ext.context.subscriptions.push(ext.volumesTreeView);
    /* eslint-disable-next-line @typescript-eslint/promise-function-async */
    registerCommand(volumesLoadMore, (context: IActionContext, node: AzExtTreeItem) => ext.volumesTree.loadMore(node, context));

    ext.contextsRoot = new ContextsTreeItem(undefined);
    const contextsLoadMore = 'vscode-docker.contexts.loadMore';
    ext.contextsTree = new AzExtTreeDataProvider(ext.contextsRoot, contextsLoadMore);
    ext.contextsTreeView = vscode.window.createTreeView('vscode-docker.views.dockerContexts', { treeDataProvider: ext.contextsTree, canSelectMany: false });
    ext.context.subscriptions.push(ext.contextsTreeView);
    /* eslint-disable-next-line @typescript-eslint/promise-function-async */
    registerCommand(contextsLoadMore, (context: IActionContext, node: AzExtTreeItem) => ext.contextsTree.loadMore(node, context));

    const helpRoot = new HelpsTreeItem(undefined);
    const helpTreeDataProvider = new AzExtTreeDataProvider(helpRoot, 'vscode-docker.help.loadMore');
    const helpTreeView = vscode.window.createTreeView('vscode-docker.views.help', { treeDataProvider: helpTreeDataProvider, canSelectMany: false });
    ext.context.subscriptions.push(helpTreeView);

    // Allows OpenUrlTreeItem to open URLs
    registerCommand('vscode-docker.openUrl', async (context: IActionContext, node: OpenUrlTreeItem) => node.openUrl());

    // Register the refresh manager
    ext.context.subscriptions.push(new RefreshManager());
}
