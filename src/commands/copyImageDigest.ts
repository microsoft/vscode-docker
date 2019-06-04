/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { ext } from "../extensionVariables";
import { AzureTaskRunTreeItem } from "../tree/azure/AzureTaskRunTreeItem";
import { TagTreeItemBase } from "../tree/TagTreeItemBase";
import { nonNullProp } from "../utils/nonNull";

export async function copyImageDigest(context: IActionContext, node?: TagTreeItemBase | AzureTaskRunTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<TagTreeItemBase>(/^(azure|private)Tag$/i, context);
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
            digest = await (<TagTreeItemBase>node).getDigest();
        });
    }

    vscode.env.clipboard.writeText(digest);
}
