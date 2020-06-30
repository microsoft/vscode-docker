/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AzExtTreeDataProvider, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { registerCommand } from '../commands/registerCommands';
import { ext } from '../extensionVariables';
import { dockerContextManager } from "../utils/dockerContextManager";
import { ContainersTreeItem } from './containers/ContainersTreeItem';
import { ContextsTreeItem } from './contexts/ContextsTreeItem';
import { HelpsTreeItem } from './help/HelpsTreeItem';
import { ImagesTreeItem } from "./images/ImagesTreeItem";
import { NetworksTreeItem } from "./networks/NetworksTreeItem";
import { OpenUrlTreeItem } from './OpenUrlTreeItem';
import { RegistriesTreeItem } from "./registries/RegistriesTreeItem";
import { VolumesTreeItem } from "./volumes/VolumesTreeItem";

export function registerTrees(): void {
    ext.containersRoot = new ContainersTreeItem(undefined);
    const containersLoadMore = 'vscode-docker.containers.loadMore';
    ext.containersTree = new AzExtTreeDataProvider(ext.containersRoot, containersLoadMore);
    ext.containersTreeView = vscode.window.createTreeView('dockerContainers', { treeDataProvider: ext.containersTree, canSelectMany: true });
    ext.context.subscriptions.push(ext.containersTreeView);
    ext.containersRoot.registerRefreshEvents(ext.containersTreeView);
    /* eslint-disable-next-line @typescript-eslint/promise-function-async */
    registerCommand(containersLoadMore, (context: IActionContext, node: AzExtTreeItem) => ext.containersTree.loadMore(node, context));
    registerCommand('vscode-docker.containers.refresh', async (_context: IActionContext, node?: AzExtTreeItem) => {
        dockerContextManager.expediteContextCheck();
        await ext.containersTree.refresh(node);
    });

    ext.networksRoot = new NetworksTreeItem(undefined);
    const networksLoadMore = 'vscode-docker.networks.loadMore';
    ext.networksTree = new AzExtTreeDataProvider(ext.networksRoot, networksLoadMore);
    ext.networksTreeView = vscode.window.createTreeView('dockerNetworks', { treeDataProvider: ext.networksTree, canSelectMany: true });
    ext.context.subscriptions.push(ext.networksTreeView);
    ext.networksRoot.registerRefreshEvents(ext.networksTreeView);
    /* eslint-disable-next-line @typescript-eslint/promise-function-async */
    registerCommand(networksLoadMore, (context: IActionContext, node: AzExtTreeItem) => ext.networksTree.loadMore(node, context));
    registerCommand('vscode-docker.networks.refresh', async (_context: IActionContext, node?: AzExtTreeItem) => {
        dockerContextManager.expediteContextCheck();
        await ext.networksTree.refresh(node);
    });

    ext.imagesRoot = new ImagesTreeItem(undefined);
    const imagesLoadMore = 'vscode-docker.images.loadMore';
    ext.imagesTree = new AzExtTreeDataProvider(ext.imagesRoot, imagesLoadMore);
    ext.imagesTreeView = vscode.window.createTreeView('dockerImages', { treeDataProvider: ext.imagesTree, canSelectMany: true });
    ext.context.subscriptions.push(ext.imagesTreeView);
    ext.imagesRoot.registerRefreshEvents(ext.imagesTreeView);
    /* eslint-disable-next-line @typescript-eslint/promise-function-async */
    registerCommand(imagesLoadMore, (context: IActionContext, node: AzExtTreeItem) => ext.imagesTree.loadMore(node, context));
    registerCommand('vscode-docker.images.refresh', async (_context: IActionContext, node?: AzExtTreeItem) => {
        dockerContextManager.expediteContextCheck();
        await ext.imagesTree.refresh(node);
    });

    ext.registriesRoot = new RegistriesTreeItem();
    const registriesLoadMore = 'vscode-docker.registries.loadMore';
    ext.registriesTree = new AzExtTreeDataProvider(ext.registriesRoot, registriesLoadMore);
    ext.registriesTreeView = vscode.window.createTreeView('dockerRegistries', { treeDataProvider: ext.registriesTree, showCollapseAll: true, canSelectMany: false });
    ext.context.subscriptions.push(ext.registriesTreeView);
    /* eslint-disable-next-line @typescript-eslint/promise-function-async */
    registerCommand(registriesLoadMore, (context: IActionContext, node: AzExtTreeItem) => ext.registriesTree.loadMore(node, context));
    registerCommand('vscode-docker.registries.refresh', async (_context: IActionContext, node?: AzExtTreeItem) => ext.registriesTree.refresh(node));

    ext.volumesRoot = new VolumesTreeItem(undefined);
    const volumesLoadMore = 'vscode-docker.volumes.loadMore';
    ext.volumesTree = new AzExtTreeDataProvider(ext.volumesRoot, volumesLoadMore);
    ext.volumesTreeView = vscode.window.createTreeView('dockerVolumes', { treeDataProvider: ext.volumesTree, canSelectMany: true });
    ext.context.subscriptions.push(ext.volumesTreeView);
    ext.volumesRoot.registerRefreshEvents(ext.volumesTreeView);
    /* eslint-disable-next-line @typescript-eslint/promise-function-async */
    registerCommand(volumesLoadMore, (context: IActionContext, node: AzExtTreeItem) => ext.volumesTree.loadMore(node, context));
    registerCommand('vscode-docker.volumes.refresh', async (_context: IActionContext, node?: AzExtTreeItem) => {
        dockerContextManager.expediteContextCheck();
        await ext.volumesTree.refresh(node);
    });

    ext.contextsRoot = new ContextsTreeItem(undefined);
    const contextsLoadMore = 'vscode-docker.contexts.loadMore';
    ext.contextsTree = new AzExtTreeDataProvider(ext.contextsRoot, contextsLoadMore);
    ext.contextsTreeView = vscode.window.createTreeView('vscode-docker.views.dockerContexts', { treeDataProvider: ext.contextsTree, canSelectMany: false });
    ext.context.subscriptions.push(ext.contextsTreeView);
    ext.contextsRoot.registerRefreshEvents(ext.contextsTreeView);
    /* eslint-disable-next-line @typescript-eslint/promise-function-async */
    registerCommand(contextsLoadMore, (context: IActionContext, node: AzExtTreeItem) => ext.contextsTree.loadMore(node, context));

    const helpRoot = new HelpsTreeItem(undefined);
    const helpTreeDataProvider = new AzExtTreeDataProvider(helpRoot, 'vscode-docker.help.loadMore');
    const helpTreeView = vscode.window.createTreeView('vscode-docker.views.help', { treeDataProvider: helpTreeDataProvider, canSelectMany: false });
    ext.context.subscriptions.push(helpTreeView);

    registerCommand('vscode-docker.openUrl', async (_context: IActionContext, node: OpenUrlTreeItem) => node.openUrl());
}
