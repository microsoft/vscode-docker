/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
import { Registry, RegistryNameStatus } from "azure-arm-containerregistry/lib/models";
import { SubscriptionModels } from 'azure-arm-resource';
import { ResourceGroup } from "azure-arm-resource/lib/resource/models";
import * as vscode from "vscode";
import { dockerExplorerProvider } from '../../dockerExtension';
import { ext } from '../../extensionVariables';
import { AzureUtilityManager } from '../../utils/azureUtilityManager';
import { quickPickLocation, quickPickResourceGroup, quickPickSKU, quickPickSubscription } from '../utils/quick-pick-azure';

/* Creates a new Azure container registry based on user input/selection of features */
export async function createRegistry(): Promise<Registry> {
    const subscription: SubscriptionModels.Subscription = await quickPickSubscription();
    const resourceGroup: ResourceGroup = await quickPickResourceGroup(true, subscription);
    const client = AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);
    const registryName: string = await acquireRegistryName(client);
    const sku: string = await quickPickSKU();
    const location = await quickPickLocation(subscription);

    const registry = await client.registries.beginCreate(resourceGroup.name, registryName, {
        'sku': { 'name': sku },
        'location': location
    });
    vscode.window.showInformationMessage(registry.name + ' has been created succesfully!');
    dockerExplorerProvider.refreshRegistries();
    return registry;
}

/** Acquires a new registry name from a user, validating that the name is unique */
async function acquireRegistryName(client: ContainerRegistryManagementClient): Promise<string> {
    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: false,
        prompt: 'New Registry name? '
    };
    let registryName: string = await ext.ui.showInputBox(opt);

    let registryStatus: RegistryNameStatus = await client.registries.checkNameAvailability({ 'name': registryName });
    while (!registryStatus.nameAvailable) {
        opt = {
            ignoreFocusOut: false,
            prompt: `The Registry name '${registryName}' is unavailable. Try again: `
        }
        registryName = await ext.ui.showInputBox(opt);
        registryStatus = await client.registries.checkNameAvailability({ 'name': registryName });
    }
    return registryName;
}
