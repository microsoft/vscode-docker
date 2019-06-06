/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BlobService, createBlobServiceWithSas } from "azure-storage";
import { IActionContext } from "vscode-azureextensionui";
import { ext } from "../../../../extensionVariables";
import { AzureTaskRunTreeItem } from "../../../../tree/registries/azure/AzureTaskRunTreeItem";
import { getBlobInfo, getBlobToText, IBlobInfo } from "../../../../utils/azureUtils";
import { fsUtils } from "../../../../utils/fsUtils";
import { nonNullProp } from "../../../../utils/nonNull";

export async function viewAzureTaskLogs(context: IActionContext, node?: AzureTaskRunTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<AzureTaskRunTreeItem>(AzureTaskRunTreeItem.contextValue, context);
    }

    const registryTI = node.parent.parent.parent;
    await node.runWithTemporaryDescription('Retrieving logs...', async () => {
        const result = await registryTI.client.runs.getLogSasUrl(registryTI.resourceGroup, registryTI.registryName, node.runId);
        let blobInfo: IBlobInfo = getBlobInfo(nonNullProp(result, 'logLink'));
        let blob: BlobService = createBlobServiceWithSas(blobInfo.host, blobInfo.sasToken);
        let content = await getBlobToText(blobInfo, blob, 0);
        await fsUtils.openLogInEditor(content);
    });
}
