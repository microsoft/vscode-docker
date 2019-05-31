/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from "azure-arm-containerregistry/lib/models";
import { SubscriptionModels } from "azure-arm-resource";
import * as vscode from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { AzureRegistryNode } from '../../../explorer/models/azureRegistryNodes';
import { ext } from "../../extensionVariables";
import * as acrTools from '../../utils/Azure/acrTools';
import { AzureUtilityManager } from '../../utils/azureUtilityManager';
import { nonNullProp } from "../../utils/nonNull";
import { confirmUserIntent, quickPickACRRegistry } from '../../utils/quick-pick-azure';

/** Delete a registry and all it's associated nested items
 * @param node : the AzureRegistryNode the user right clicked on to delete
 */
export async function deleteAzureRegistry(_context: IActionContext, node?: AzureRegistryNode): Promise<void> {
    let registry: Registry;
    if (node) {
        registry = node.registry;
    } else {
        registry = await quickPickACRRegistry(false, undefined, 'Select the registry you want to delete');
    }
    const shouldDelete = await confirmUserIntent(`Are you sure you want to delete ${registry.name} and its associated images?`);
    if (shouldDelete) {
        let subscription: SubscriptionModels.Subscription = await acrTools.getSubscriptionFromRegistry(registry);
        let resourceGroup: string = acrTools.getResourceGroupName(registry);
        const client = await AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);
        await client.registries.beginDeleteMethod(resourceGroup, nonNullProp(registry, 'name'));
        vscode.window.showInformationMessage(`Successfully deleted registry ${registry.name}`);
        ext.dockerExplorerProvider.refreshRegistries();
    }
}
