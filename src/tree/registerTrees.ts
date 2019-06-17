/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window } from "vscode";
import { AzExtTreeDataProvider, AzExtTreeItem, IActionContext, registerCommand } from "vscode-azureextensionui";
import { ext } from '../extensionVariables';
import { ContainersTreeItem } from './containers/ContainersTreeItem';
import { ImagesTreeItem } from "./images/ImagesTreeItem";
import { NetworksTreeItem } from "./networks/NetworksTreeItem";
import { OpenUrlTreeItem } from "./OpenUrlTreeItem";
import { RegistriesTreeItem } from "./registries/RegistriesTreeItem";
import { VolumesTreeItem } from "./volumes/VolumesTreeItem";

export function registerTrees(): void {
    const containersTreeItem = new ContainersTreeItem(undefined);
    const containersLoadMore = 'vscode-docker.containers.loadMore';
    ext.containersTree = new AzExtTreeDataProvider(containersTreeItem, containersLoadMore);
    ext.containersTreeView = window.createTreeView('dockerContainers', { treeDataProvider: ext.containersTree });
    ext.context.subscriptions.push(ext.containersTreeView);
    containersTreeItem.initAutoRefresh(ext.containersTreeView);
    registerCommand(containersLoadMore, (context: IActionContext, node: AzExtTreeItem) => ext.containersTree.loadMore(node, context));
    registerCommand('vscode-docker.containers.refresh', async (_context: IActionContext, node?: AzExtTreeItem) => ext.containersTree.refresh(node));

    const networksTreeItem = new NetworksTreeItem(undefined);
    const networksLoadMore = 'vscode-docker.networks.loadMore';
    ext.networksTree = new AzExtTreeDataProvider(networksTreeItem, networksLoadMore);
    ext.networksTreeView = window.createTreeView('dockerNetworks', { treeDataProvider: ext.networksTree });
    ext.context.subscriptions.push(ext.networksTreeView);
    networksTreeItem.initAutoRefresh(ext.networksTreeView);
    registerCommand(networksLoadMore, (context: IActionContext, node: AzExtTreeItem) => ext.networksTree.loadMore(node, context));
    registerCommand('vscode-docker.networks.refresh', async (_context: IActionContext, node?: AzExtTreeItem) => ext.networksTree.refresh(node));

    const imagesTreeItem = new ImagesTreeItem(undefined);
    const imagesLoadMore = 'vscode-docker.images.loadMore';
    ext.imagesTree = new AzExtTreeDataProvider(imagesTreeItem, imagesLoadMore);
    ext.imagesTreeView = window.createTreeView('dockerImages', { treeDataProvider: ext.imagesTree });
    ext.context.subscriptions.push(ext.imagesTreeView);
    imagesTreeItem.initAutoRefresh(ext.imagesTreeView);
    registerCommand(imagesLoadMore, (context: IActionContext, node: AzExtTreeItem) => ext.imagesTree.loadMore(node, context));
    registerCommand('vscode-docker.images.refresh', async (_context: IActionContext, node?: AzExtTreeItem) => ext.imagesTree.refresh(node));

    const registriesTreeItem = new RegistriesTreeItem(undefined);
    const registriesLoadMore = 'vscode-docker.registries.loadMore';
    ext.registriesTree = new AzExtTreeDataProvider(registriesTreeItem, registriesLoadMore);
    ext.registriesTreeView = window.createTreeView('dockerRegistries', { treeDataProvider: ext.registriesTree });
    ext.context.subscriptions.push(ext.registriesTreeView);
    registerCommand(registriesLoadMore, (context: IActionContext, node: AzExtTreeItem) => ext.registriesTree.loadMore(node, context));
    registerCommand('vscode-docker.registries.refresh', async (_context: IActionContext, node?: AzExtTreeItem) => ext.registriesTree.refresh(node));

    const volumesTreeItem = new VolumesTreeItem(undefined);
    const volumesLoadMore = 'vscode-docker.volumes.loadMore';
    ext.volumesTree = new AzExtTreeDataProvider(volumesTreeItem, volumesLoadMore);
    ext.volumesTreeView = window.createTreeView('dockerVolumes', { treeDataProvider: ext.volumesTree });
    ext.context.subscriptions.push(ext.volumesTreeView);
    volumesTreeItem.initAutoRefresh(ext.volumesTreeView);
    registerCommand(volumesLoadMore, (context: IActionContext, node: AzExtTreeItem) => ext.volumesTree.loadMore(node, context));
    registerCommand('vscode-docker.volumes.refresh', async (_context: IActionContext, node?: AzExtTreeItem) => ext.volumesTree.refresh(node));

    registerCommand('vscode-docker.openUrl', async (_context: IActionContext, node: OpenUrlTreeItem) => node.openUrl());
}
