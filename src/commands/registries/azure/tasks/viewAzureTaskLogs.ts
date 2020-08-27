/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BlobClient } from "@azure/storage-blob";
import { IActionContext, openReadOnlyContent } from "vscode-azureextensionui";
import { ext } from "../../../../extensionVariables";
import { localize } from "../../../../localize";
import { AzureTaskRunTreeItem } from "../../../../tree/registries/azure/AzureTaskRunTreeItem";
import { nonNullProp } from "../../../../utils/nonNull";
import { bufferToString } from "../../../../utils/spawnAsync";

export async function viewAzureTaskLogs(context: IActionContext, node?: AzureTaskRunTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<AzureTaskRunTreeItem>(AzureTaskRunTreeItem.contextValue, context);
    }

    const registryTI = node.parent.parent.parent;
    await node.runWithTemporaryDescription(localize('vscode-docker.commands.registries.azure.tasks.retrievingLogs', 'Retrieving logs...'), async () => {
        const result = await registryTI.client.runs.getLogSasUrl(registryTI.resourceGroup, registryTI.registryName, node.runId);

        const blobClient = new BlobClient(nonNullProp(result, 'logLink'));
        const contentBuffer = await blobClient.downloadToBuffer();
        const content = bufferToString(contentBuffer);

        await openReadOnlyContent(node, content, '.log');
    });
}
