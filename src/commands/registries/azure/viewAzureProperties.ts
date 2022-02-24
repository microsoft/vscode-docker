/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, openReadOnlyJson } from "@microsoft/vscode-azext-utils";
import { ext } from "../../../extensionVariables";
import { AzureRegistryTreeItem } from "../../../tree/registries/azure/AzureRegistryTreeItem";
import { AzureTaskRunTreeItem } from "../../../tree/registries/azure/AzureTaskRunTreeItem";
import { AzureTaskTreeItem } from "../../../tree/registries/azure/AzureTaskTreeItem";
import { registryExpectedContextValues } from "../../../tree/registries/registryContextValues";

export async function viewAzureProperties(context: IActionContext, node?: AzureRegistryTreeItem | AzureTaskTreeItem | AzureTaskRunTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<AzureRegistryTreeItem>(registryExpectedContextValues.azure.registry, context);
    }

    await openReadOnlyJson(node, node.properties);
}
