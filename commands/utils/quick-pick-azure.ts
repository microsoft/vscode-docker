/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from 'azure-arm-containerregistry/lib/models';
import { ResourceGroup } from 'azure-arm-resource/lib/resource/models';
import { Location, Subscription } from 'azure-arm-resource/lib/subscription/models';
import * as opn from 'opn';
import * as vscode from "vscode";
import { skus } from '../../constants'
import { ext } from '../../extensionVariables';
import { IAzureQuickPickItem } from '../../node_modules/vscode-azureextensionui';
import * as acrTools from '../../utils/Azure/acrTools';
import { AzureImage } from "../../utils/Azure/models/image";
import { Repository } from "../../utils/Azure/models/repository";
import { AzureUtilityManager } from '../../utils/azureUtilityManager';

export async function quickPickACRImage(repository: Repository, prompt?: string): Promise<AzureImage> {
    const placeHolder = prompt ? prompt : 'Choose image to use';
    const repoImages: AzureImage[] = await acrTools.getImagesByRepository(repository);
    const imageListNames = repoImages.map(img => <IAzureQuickPickItem<AzureImage>>{ label: img.tag, data: img });
    let desiredImage = await ext.ui.showQuickPick(imageListNames, { 'canPickMany': false, 'placeHolder': placeHolder });
    return desiredImage.data;
}

export async function quickPickACRRepository(registry: Registry, prompt?: string): Promise<Repository> {
    const placeHolder = prompt ? prompt : 'Choose registry to use';
    const repositories: Repository[] = await acrTools.getRepositoriesByRegistry(registry);
    const quickPickRepoList = repositories.map(repo => <IAzureQuickPickItem<Repository>>{ label: repo.name, data: repo });
    let desiredRepo = await ext.ui.showQuickPick(quickPickRepoList, { 'canPickMany': false, 'placeHolder': placeHolder });
    return desiredRepo.data;
}

export async function quickPickACRRegistry(canCreateNew: boolean = false, prompt?: string): Promise<Registry> {
    const placeHolder = prompt ? prompt : 'Choose registry to use';
    let registries = await AzureUtilityManager.getInstance().getRegistries();
    interface RegistryWrapper {
        isCreateNew?: boolean;
        registry?: Registry;
    }
    let quickPickRegList: IAzureQuickPickItem<RegistryWrapper>[] = [];
    if (canCreateNew) {
        quickPickRegList.push(<IAzureQuickPickItem<RegistryWrapper>>{ label: "+ Create a new registry", data: { isCreateNew: true } });
    }
    quickPickRegList = quickPickRegList.concat(registries.map(reg => <IAzureQuickPickItem<RegistryWrapper>>{ label: reg.name, data: { registry: reg } }));
    let desiredReg: IAzureQuickPickItem<RegistryWrapper> = await ext.ui.showQuickPick(quickPickRegList, {
        'canPickMany': false,
        'placeHolder': placeHolder
    });
    let registry: Registry;
    if (canCreateNew && desiredReg.data.isCreateNew) {
        registry = <Registry>await vscode.commands.executeCommand("vscode-docker.create-ACR-Registry");
    } else {
        registry = desiredReg.data.registry;
    }
    return registry;
}

export async function quickPickSKU(): Promise<string> {
    const quickPickSkuList = skus.map(sk => <IAzureQuickPickItem<string>>{ label: sk, data: sk });
    let desiredSku: IAzureQuickPickItem<string> = await ext.ui.showQuickPick(quickPickSkuList, { 'canPickMany': false, 'placeHolder': 'Choose a SKU to use' });
    return desiredSku.data;
}

export async function quickPickSubscription(): Promise<Subscription> {
    const subscriptions = AzureUtilityManager.getInstance().getFilteredSubscriptionList();
    if (subscriptions.length === 0) {
        vscode.window.showErrorMessage("You do not have any subscriptions. You can create one in your Azure portal", "Open Portal").then(val => {
            if (val === "Open Portal") {
                opn('https://portal.azure.com/');
            }
        });
        throw new Error('User has no azure subscriptions');
    }
    let quickPickSubList = subscriptions.map(sub => <IAzureQuickPickItem<Subscription>>{ label: sub.displayName, data: sub });
    let desiredSub = await ext.ui.showQuickPick(quickPickSubList, {
        'canPickMany': false,
        'placeHolder': 'Choose a subscription to use'
    });
    return desiredSub.data;
}

export async function quickPickLocation(subscription: Subscription): Promise<string> {
    let locations: Location[] = await AzureUtilityManager.getInstance().getLocationsBySubscription(subscription);
    let quickPickLocList = locations.map(loc => <IAzureQuickPickItem<Location>>{ label: loc.displayName, data: loc });

    quickPickLocList.sort((loc1, loc2): number => {
        return loc1.data.displayName.localeCompare(loc2.data.displayName);
    });

    let desiredLocation: IAzureQuickPickItem<Location> = await ext.ui.showQuickPick(quickPickLocList, {
        'canPickMany': false,
        'placeHolder': 'Choose a location to use'
    });
    return desiredLocation.label;
}

export async function quickPickResourceGroup(canCreateNew?: boolean, subscription?: Subscription): Promise<ResourceGroup> {
    let resourceGroups = await AzureUtilityManager.getInstance().getResourceGroups(subscription);
    let resourceGroupNames: string[] = [];

    if (canCreateNew) { resourceGroupNames.push('+ Create new resource group'); }
    for (let resGroupName of resourceGroups) {
        resourceGroupNames.push(resGroupName.name);
    }

    let resourceGroupName = await vscode.window.showQuickPick(resourceGroupNames, {
        'canPickMany': false,
        'placeHolder': 'Choose a resource group to use'
    });

    let resourceGroup: ResourceGroup;
    if (canCreateNew && resourceGroupName === resourceGroupNames[0]) {
        if (!subscription) {
            subscription = await quickPickSubscription();
        }
        const loc = await quickPickLocation(subscription);
        resourceGroup = await createNewResourceGroup(loc, subscription);
    } else {
        resourceGroup = resourceGroups.find(resGroup => { return resGroup.name === resourceGroupName; });
    }
    return resourceGroup;
}

/** Requests confirmation for an action and returns true only in the case that the user types in yes
 * @param yesOrNoPrompt Should be a yes or no question
 */
export async function confirmUserIntent(yesOrNoPrompt: string): Promise<boolean> {
    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        placeHolder: 'No',
        value: 'No',
        prompt: yesOrNoPrompt
    };
    let answer = await ext.ui.showInputBox(opt);
    answer = answer.toLowerCase();
    return answer === 'yes';
}

/*Creates a new resource group within the current subscription */
async function createNewResourceGroup(loc: string, subscription?: Subscription): Promise<ResourceGroup> {
    const resourceGroupClient = AzureUtilityManager.getInstance().getResourceManagementClient(subscription);

    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: false,
        prompt: 'New resource group name?'
    };

    let resourceGroupName: string;
    let resourceGroupStatus: boolean;

    while (opt.prompt) {
        resourceGroupName = await ext.ui.showInputBox(opt);
        resourceGroupStatus = await resourceGroupClient.resourceGroups.checkExistence(resourceGroupName);
        if (!resourceGroupStatus) {
            opt.prompt = undefined;
        } else {
            opt.prompt = `The resource group '${resourceGroupName}' already exists. Try again: `;
        }
    }

    let newResourceGroup: ResourceGroup = {
        name: resourceGroupName,
        location: loc,
    };

    return await resourceGroupClient.resourceGroups.createOrUpdate(resourceGroupName, newResourceGroup);
}
