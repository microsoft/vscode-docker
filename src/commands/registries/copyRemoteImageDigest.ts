/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { AzureTaskRunTreeItem } from "../../tree/registries/azure/AzureTaskRunTreeItem";
import { RemoteTagTreeItemBase } from "../../tree/registries/RemoteTagTreeItemBase";
import { nonNullProp } from "../../utils/nonNull";

export async function copyRemoteImageDigest(context: IActionContext, node?: RemoteTagTreeItemBase | AzureTaskRunTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<RemoteTagTreeItemBase>(/^(azure|private)Tag$/i, context);
    }

    let digest: string;
    if (node instanceof AzureTaskRunTreeItem) {
        if (node.outputImage) {
            digest = nonNullProp(node.outputImage, 'digest');
        } else {
            throw new Error('Failed to find output image for this task run.');
        }
    } else {
        await node.runWithTemporaryDescription('Getting digest...', async () => {
            digest = await (<RemoteTagTreeItemBase>node).getDigest();
        });
    }

    vscode.env.clipboard.writeText(digest);
}
