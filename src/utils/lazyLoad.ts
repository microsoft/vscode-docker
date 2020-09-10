/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { AzureTaskRunTreeItem } from '../tree/registries/azure/AzureTaskRunTreeItem';
import { RemoteTagTreeItem } from '../tree/registries/RemoteTagTreeItem';
import { Lazy } from './lazy';

// This allows us to defer loading of vscode-azureappservice and @azure/arm-appservice, primarily
const deployImageToAzureLazy = new Lazy<Promise<(context: IActionContext, node?: RemoteTagTreeItem) => Promise<void>>>(async () => {
    const appService = (await import(/* webpackChunkName: "appService" */ 'vscode-azureappservice'));

    appService.registerAppServiceExtensionVariables(ext);

    return (await import(/* webpackChunkName: "deployImageToAzure" */ '../commands/registries/azure/deployImageToAzure')).deployImageToAzure;
});

export async function deployImageToAzure(context: IActionContext, node?: RemoteTagTreeItem): Promise<void> {
    const deployImageToAzureFunction = await deployImageToAzureLazy.value;
    return await deployImageToAzureFunction(context, node);
}

// This allows us to defer loading of @azure/storage-blob
const scheduleRunRequestLazy = new Lazy<Promise<(context: IActionContext, requestType: 'DockerBuildRequest' | 'FileTaskRunRequest', uri?: vscode.Uri) => Promise<void>>>(async () => {
    return (await import(/* webpackChunkName: "scheduleRunRequest" */ '../commands/registries/azure/tasks/scheduleRunRequest')).scheduleRunRequest;
});

export async function scheduleRunRequest(context: IActionContext, requestType: 'DockerBuildRequest' | 'FileTaskRunRequest', uri: vscode.Uri): Promise<void> {
    const scheduleRunRequestFunction = await scheduleRunRequestLazy.value;
    return await scheduleRunRequestFunction(context, requestType, uri);
}

// This is also to defer loading of @azure/storage-blob
const viewAzureTaskLogsLazy = new Lazy<Promise<(context: IActionContext, node?: AzureTaskRunTreeItem) => Promise<void>>>(async () => {
    return (await import(/* webpackChunkName: "viewAzureTaskLogs" */ '../commands/registries/azure/tasks/viewAzureTaskLogs')).viewAzureTaskLogs;
})

export async function viewAzureTaskLogs(context: IActionContext, node?: AzureTaskRunTreeItem): Promise<void> {
    const viewAzureTaskLogsFunction = await viewAzureTaskLogsLazy.value;
    return await viewAzureTaskLogsFunction(context, node);
}
