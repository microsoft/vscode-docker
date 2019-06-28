/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, openReadOnlyJson } from "vscode-azureextensionui";
import { ext } from "../../../extensionVariables";
import { AzureRegistryTreeItem } from "../../../tree/registries/azure/AzureRegistryTreeItem";
import { AzureTaskRunTreeItem } from "../../../tree/registries/azure/AzureTaskRunTreeItem";
import { AzureTaskTreeItem } from "../../../tree/registries/azure/AzureTaskTreeItem";

export async function viewAzureProperties(context: IActionContext, node?: AzureRegistryTreeItem | AzureTaskTreeItem | AzureTaskRunTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<AzureRegistryTreeItem>(AzureRegistryTreeItem.contextValue, context);
    }

    await openReadOnlyJson(node, node.properties);
}
