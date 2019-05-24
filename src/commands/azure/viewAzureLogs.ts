/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from "azure-arm-containerregistry/lib/models";
import { Subscription } from "azure-arm-resource/lib/subscription/models";
import * as vscode from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { AzureImageTagNode, AzureRegistryNode } from '../../../explorer/models/azureRegistryNodes';
import { TaskNode } from "../../../explorer/models/taskNode";
import { getResourceGroupName, getSubscriptionFromRegistry } from '../../utils/Azure/acrTools';
import { AzureUtilityManager } from '../../utils/azureUtilityManager';
import { quickPickACRRegistry } from '../../utils/quick-pick-azure';
import { accessLog } from "./acr-log-utils/LogContentProvider";
import { LogData } from "./acr-log-utils/LogData";
import { LogTableWebview } from "./acr-log-utils/LogTableWebview";

/**  This command is used through a right click on an azure registry, repository or image in the Docker Explorer. It is used to view ACR logs for a given item. */
export async function viewAzureLogs(_context: IActionContext, node: AzureRegistryNode | AzureImageTagNode | TaskNode): Promise<void> {
    let registry: Registry;
    let subscription: Subscription;
    if (!node) {
        registry = await quickPickACRRegistry();
        subscription = await getSubscriptionFromRegistry(registry);
    } else {
        registry = node.registry;
        subscription = node.subscription;
    }
    let resourceGroup: string = getResourceGroupName(registry);
    const client = await AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);
    let logData: LogData = new LogData(client, registry, resourceGroup);

    // Filtering provided
    if (node && node instanceof AzureImageTagNode) {
        //ACR Image Logs
        await logData.loadLogs({
            webViewEvent: false,
            loadNext: false,
            removeOld: false,
            filter: { image: node.label }
        });
        if (!hasValidLogContent(node, logData)) { return; }
        const url = await logData.getLink(0);
        await accessLog(url, logData.logs[0].runId, false);
    } else {
        if (node && node instanceof TaskNode) {
            //ACR Task Logs
            await logData.loadLogs({
                webViewEvent: false,
                loadNext: false,
                removeOld: false,
                filter: { task: node.label }
            });
        } else {
            //ACR Registry Logs
            await logData.loadLogs({
                webViewEvent: false,
                loadNext: false
            });
        }
        if (!hasValidLogContent(node, logData)) { return; }
        let webViewTitle = registry.name;
        if (node instanceof TaskNode) {
            webViewTitle += '/' + node.label;
        }

        // grandfathered in - should ideally be refactored so that calling a constructor does not have side effects
        // tslint:disable-next-line: no-unused-expression
        new LogTableWebview(webViewTitle, logData);
    }
}

function hasValidLogContent(node: AzureRegistryNode | AzureImageTagNode | TaskNode, logData: LogData): boolean {
    if (logData.logs.length === 0) {
        let itemType: string;
        if (node && node instanceof TaskNode) {
            itemType = 'task';
        } else if (node && node instanceof AzureImageTagNode) {
            itemType = 'image';
        } else {
            itemType = 'registry';
        }
        vscode.window.showInformationMessage(`This ${itemType} has no associated logs`);
        return false;
    }
    return true;
}
