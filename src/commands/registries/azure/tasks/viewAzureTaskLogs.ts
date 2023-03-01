/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, nonNullProp, openReadOnlyContent } from "@microsoft/vscode-azext-utils";
import { l10n } from 'vscode';
import { ext } from "../../../../extensionVariables";
import { AzureTaskRunTreeItem } from "../../../../tree/registries/azure/AzureTaskRunTreeItem";
import { bufferToString } from "../../../../utils/execAsync";
import { getStorageBlob } from "../../../../utils/lazyPackages";

export async function viewAzureTaskLogs(context: IActionContext, node?: AzureTaskRunTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<AzureTaskRunTreeItem>(AzureTaskRunTreeItem.contextValue, context);
    }

    const registryTI = node.parent.parent.parent;
    await node.runWithTemporaryDescription(context, l10n.t('Retrieving logs...'), async () => {
        const result = await (await registryTI.getClient(context)).runs.getLogSasUrl(registryTI.resourceGroup, registryTI.registryName, node.runId);

        const storageBlob = await getStorageBlob();
        const blobClient = new storageBlob.BlobClient(nonNullProp(result, 'logLink'));
        const contentBuffer = await blobClient.downloadToBuffer();
        const content = bufferToString(contentBuffer);

        await openReadOnlyContent(node, content, '.log');
    });
}
