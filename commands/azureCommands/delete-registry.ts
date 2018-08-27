/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from "azure-arm-containerregistry/lib/models";
import { SubscriptionModels } from "azure-arm-resource";
import * as vscode from "vscode";
import { dockerExplorerProvider } from '../../dockerExtension';
import { AzureRegistryNode } from '../../explorer/models/azureRegistryNodes';
import * as acrTools from '../../utils/Azure/acrTools';
import { AzureUtilityManager } from '../../utils/azureUtilityManager';
import { confirmUserIntent, quickPickACRRegistry } from '../utils/quick-pick-azure';

/** Delete a registry and all it's associated nested items
 * @param context : the AzureRegistryNode the user right clicked on to delete
 */
export async function deleteAzureRegistry(context?: AzureRegistryNode): Promise<void> {
    let registry: Registry;
    if (context) {
        registry = context.registry;
    } else {
        registry = await quickPickACRRegistry(false, 'Select the registry you want to delete');
    }
    const shouldDelete = await confirmUserIntent(`Are you sure you want to delete ${registry.name} and its associated images?`);
    if (shouldDelete) {
        let subscription: SubscriptionModels.Subscription = acrTools.getSubscriptionFromRegistry(registry);
        let resourceGroup: string = acrTools.getResourceGroupName(registry);
        const client = AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);
        await client.registries.beginDeleteMethod(resourceGroup, registry.name);
        vscode.window.showInformationMessage(`Successfully deleted registry ${registry.name}`);
        dockerExplorerProvider.refreshRegistries();
    }
}
