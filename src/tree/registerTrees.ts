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
import { migrateRegistriesData } from "./registries/migrateRegistriesData";
import { VolumesTreeItem } from "./volumes/VolumesTreeItem";

export function registerTrees(): void {
    ext.containersRoot = new ContainersTreeItem(undefined);
    const containersLoadMore = 'vscode-docker.containers.loadMore';
    ext.containersTree = new AzExtTreeDataProvider(ext.containersRoot, containersLoadMore);
    ext.containersTreeView = vscode.window.createTreeView('dockerContainers', { treeDataProvider: ext.containersTree, canSelectMany: true });
    ext.context.subscriptions.push(ext.containersTreeView);
    registerCommand(containersLoadMore, async (context: IActionContext, node: AzExtTreeItem) => ext.containersTree.loadMore(node, context));

    ext.networksRoot = new NetworksTreeItem(undefined);
    const networksLoadMore = 'vscode-docker.networks.loadMore';
    ext.networksTree = new AzExtTreeDataProvider(ext.networksRoot, networksLoadMore);
    ext.networksTreeView = vscode.window.createTreeView('dockerNetworks', { treeDataProvider: ext.networksTree, canSelectMany: true });
    ext.context.subscriptions.push(ext.networksTreeView);
    registerCommand(networksLoadMore, async (context: IActionContext, node: AzExtTreeItem) => ext.networksTree.loadMore(node, context));

    ext.imagesRoot = new ImagesTreeItem(undefined);
    const imagesLoadMore = 'vscode-docker.images.loadMore';
    ext.imagesTree = new AzExtTreeDataProvider(ext.imagesRoot, imagesLoadMore);
    ext.imagesTreeView = vscode.window.createTreeView('dockerImages', { treeDataProvider: ext.imagesTree, canSelectMany: true });
    ext.context.subscriptions.push(ext.imagesTreeView);
    registerCommand(imagesLoadMore, async (context: IActionContext, node: AzExtTreeItem) => ext.imagesTree.loadMore(node, context));

    const urtdp = new UnifiedRegistryTreeDataProvider(ext.context.globalState);
    ext.registriesRoot = urtdp;
    ext.registriesTreeView = vscode.window.createTreeView('dockerRegistries', { treeDataProvider: urtdp, showCollapseAll: true });
    ext.registriesTree = urtdp;
    registerRegistryDataProviders(urtdp);
    void migrateRegistriesData(ext.context);

    ext.volumesRoot = new VolumesTreeItem(undefined);
    const volumesLoadMore = 'vscode-docker.volumes.loadMore';
    ext.volumesTree = new AzExtTreeDataProvider(ext.volumesRoot, volumesLoadMore);
    ext.volumesTreeView = vscode.window.createTreeView('dockerVolumes', { treeDataProvider: ext.volumesTree, canSelectMany: true });
    ext.context.subscriptions.push(ext.volumesTreeView);
    registerCommand(volumesLoadMore, async (context: IActionContext, node: AzExtTreeItem) => ext.volumesTree.loadMore(node, context));

    ext.contextsRoot = new ContextsTreeItem(undefined);
    const contextsLoadMore = 'vscode-docker.contexts.loadMore';
    ext.contextsTree = new AzExtTreeDataProvider(ext.contextsRoot, contextsLoadMore);
    ext.contextsTreeView = vscode.window.createTreeView('vscode-docker.views.dockerContexts', { treeDataProvider: ext.contextsTree, canSelectMany: false });
    ext.context.subscriptions.push(ext.contextsTreeView);
    registerCommand(contextsLoadMore, async (context: IActionContext, node: AzExtTreeItem) => ext.contextsTree.loadMore(node, context));

    const helpRoot = new HelpsTreeItem(undefined);
    const helpTreeDataProvider = new AzExtTreeDataProvider(helpRoot, 'vscode-docker.help.loadMore');
    const helpTreeView = vscode.window.createTreeView('vscode-docker.views.help', { treeDataProvider: helpTreeDataProvider, canSelectMany: false });
    ext.context.subscriptions.push(helpTreeView);

    // Allows OpenUrlTreeItem to open URLs
    registerCommand('vscode-docker.openUrl', async (context: IActionContext, node: OpenUrlTreeItem) => node.openUrl());

    // Register the refresh manager
    ext.context.subscriptions.push(new RefreshManager());
}

function registerRegistryDataProviders(urtdp: UnifiedRegistryTreeDataProvider): void {
    const githubRegistryDataProvider = new GitHubRegistryDataProvider(ext.context);
    ext.context.subscriptions.push(urtdp.registerProvider(githubRegistryDataProvider));
    ext.context.subscriptions.push(githubRegistryDataProvider);
    ext.githubRegistryDataProvider = githubRegistryDataProvider;

    const dockerHubRegistryDataProvider = new DockerHubRegistryDataProvider(ext.context);
    ext.context.subscriptions.push(urtdp.registerProvider(dockerHubRegistryDataProvider));
    ext.context.subscriptions.push(dockerHubRegistryDataProvider);
    ext.dockerHubRegistryDataProvider = dockerHubRegistryDataProvider;

    const azureRegistryDataProvider = new AzureRegistryDataProvider(ext.context);
    ext.context.subscriptions.push(urtdp.registerProvider(azureRegistryDataProvider));
    ext.context.subscriptions.push(azureRegistryDataProvider);
    ext.azureRegistryDataProvider = azureRegistryDataProvider;

    const genericRegistryV2DataProvider = new GenericRegistryV2DataProvider(ext.context);
    ext.context.subscriptions.push(urtdp.registerProvider(genericRegistryV2DataProvider));
    ext.context.subscriptions.push(genericRegistryV2DataProvider);
    ext.genericRegistryV2DataProvider = genericRegistryV2DataProvider;
}
