/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, openReadOnlyJson } from "@microsoft/vscode-azext-utils";
import { ext } from "../../../extensionVariables";
import { AzureRegistry } from "../../../tree/registries/Azure/AzureRegistryDataProvider";
import { UnifiedRegistryItem, isUnifiedRegistryItem } from "../../../tree/registries/UnifiedRegistryTreeDataProvider";
import { registryExperience } from "../../../utils/registryExperience";

export async function viewAzureProperties(context: IActionContext, node?: UnifiedRegistryItem<AzureRegistry>): Promise<void> {
    if (!node) {
        node = await registryExperience(context, ext.registriesTree, { contextValueFilter: { include: 'azureContainerRegistry' }, registryFilter: { exclude: [ext.genericRegistryV2DataProvider.label, ext.dockerHubRegistryDataProvider.label, ext.githubRegistryDataProvider.label] } });
    }

    const registryItem = isUnifiedRegistryItem(node) ? node.wrappedItem : node;
    await openReadOnlyJson({ label: registryItem.label, fullId: registryItem.id }, registryItem.registryProperties);
}
