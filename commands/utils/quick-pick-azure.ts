/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from 'azure-arm-containerregistry/lib/models';
import { ResourceGroup } from 'azure-arm-resource/lib/resource/models';
import { Location, Subscription } from 'azure-arm-resource/lib/subscription/models';
import * as opn from 'opn';
import * as vscode from "vscode";
import { IAzureQuickPickItem, UserCancelledError } from 'vscode-azureextensionui';
import { skus } from '../../constants'
import { ext } from '../../extensionVariables';
import { ResourceManagementClient } from '../../node_modules/azure-arm-resource';
import * as acrTools from '../../utils/Azure/acrTools';
import { isValidAzureName } from '../../utils/Azure/common';
import { AzureImage } from "../../utils/Azure/models/image";
import { Repository } from "../../utils/Azure/models/repository";
import { AzureUtilityManager } from '../../utils/azureUtilityManager';

export async function quickPickACRImage(repository: Repository, prompt?: string): Promise<AzureImage> {
    const placeHolder = prompt ? prompt : 'Select image to use';
    const repoImages: AzureImage[] = await acrTools.getImagesByRepository(repository);
    const imageListNames = repoImages.map(img => <IAzureQuickPickItem<AzureImage>>{ label: img.tag, data: img });
    let desiredImage = await ext.ui.showQuickPick(imageListNames, { 'canPickMany': false, 'placeHolder': placeHolder });
    return desiredImage.data;
}

export async function quickPickACRRepository(registry: Registry, prompt?: string): Promise<Repository> {
    const placeHolder = prompt ? prompt : 'Select repository to use';
    const repositories: Repository[] = await acrTools.getRepositoriesByRegistry(registry);
    const quickPickRepoList = repositories.map(repo => <IAzureQuickPickItem<Repository>>{ label: repo.name, data: repo });
    let desiredRepo = await ext.ui.showQuickPick(quickPickRepoList, { 'canPickMany': false, 'placeHolder': placeHolder });
    return desiredRepo.data;
}

export async function quickPickACRRegistry(canCreateNew: boolean = false, prompt?: string): Promise<Registry> {
    const placeHolder = prompt ? prompt : 'Select registry to use';
    let registries = await AzureUtilityManager.getInstance().getRegistries();
    let quickPickRegList = registries.map(reg => <IAzureQuickPickItem<Registry | undefined>>{ label: reg.name, data: reg });

    let createNewItem: IAzureQuickPickItem<Registry | undefined> = { label: '+ Create new registry', data: undefined };
    if (canCreateNew) { quickPickRegList.unshift(createNewItem); }

    let desiredReg: IAzureQuickPickItem<Registry | undefined> = await ext.ui.showQuickPick(quickPickRegList, {
        'canPickMany': false,
        'placeHolder': placeHolder
    });
    let registry: Registry;
    if (desiredReg === createNewItem) {
        registry = <Registry>await vscode.commands.executeCommand("vscode-docker.create-ACR-Registry");
    } else {
        registry = desiredReg.data;
    }
    return registry;
}

export async function quickPickSKU(): Promise<string> {
    const quickPickSkuList = skus.map(sk => <IAzureQuickPickItem<string>>{ label: sk, data: sk });
    let desiredSku: IAzureQuickPickItem<string> = await ext.ui.showQuickPick(quickPickSkuList, {
        'canPickMany': false,
        'placeHolder': 'Choose a SKU to use'
    });
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
    }
    if (subscriptions.length === 1) { return subscriptions[0]; }

    let quickPickSubList = subscriptions.map(sub => <IAzureQuickPickItem<Subscription>>{ label: sub.displayName, data: sub });
    let desiredSub = await ext.ui.showQuickPick(quickPickSubList, {
        'canPickMany': false,
        'placeHolder': 'Select a subscription to use'
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
        'placeHolder': 'Select a location to use'
    });
    return desiredLocation.label;
}

export async function quickPickResourceGroup(canCreateNew?: boolean, subscription?: Subscription): Promise<ResourceGroup> {
    let resourceGroups = await AzureUtilityManager.getInstance().getResourceGroups(subscription);
    let quickPickResourceGroups = resourceGroups.map(res => <IAzureQuickPickItem<ResourceGroup | undefined>>{ label: res.name, data: res });

    let createNewItem: IAzureQuickPickItem<ResourceGroup | undefined> = { label: '+ Create new resource group', data: undefined };
    if (canCreateNew) { quickPickResourceGroups.unshift(createNewItem); }

    let desiredResGroup: IAzureQuickPickItem<ResourceGroup | undefined> = await ext.ui.showQuickPick(quickPickResourceGroups, {
        'canPickMany': false,
        'placeHolder': 'Choose a resource group to use'
    });

    let resourceGroup: ResourceGroup;
    if (desiredResGroup === createNewItem) {
        if (!subscription) {
            subscription = await quickPickSubscription();
        }
        const loc = await quickPickLocation(subscription);
        resourceGroup = await createNewResourceGroup(loc, subscription);
    } else {
        resourceGroup = desiredResGroup.data;
    }
    return resourceGroup;
}

/** Requests confirmation for an action and returns true only in the case that the user types in yes
 * @param yesOrNoPrompt Should be a yes or no question
 */
export async function confirmUserIntent(yesOrNoPrompt: string): Promise<boolean> {
    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        placeHolder: 'Yes',
        value: 'No',
        prompt: yesOrNoPrompt + ' Enter yes to continue'
    };
    let answer = await ext.ui.showInputBox(opt);
    answer = answer.toLowerCase();
    if (answer === 'yes') {
        return answer === 'yes';
    } else {
        throw new UserCancelledError();
    }
}

/*Creates a new resource group within the current subscription */
async function createNewResourceGroup(loc: string, subscription?: Subscription): Promise<ResourceGroup> {
    const resourceGroupClient = AzureUtilityManager.getInstance().getResourceManagementClient(subscription);

    let opt: vscode.InputBoxOptions = {
        validateInput: async (value: string) => { return await checkForValidResourcegroupName(value, resourceGroupClient) },
        ignoreFocusOut: false,
        prompt: 'New resource group name?'
    };

    let resourceGroupName: string = await ext.ui.showInputBox(opt);
    let newResourceGroup: ResourceGroup = {
        name: resourceGroupName,
        location: loc,
    };

    return await resourceGroupClient.resourceGroups.createOrUpdate(resourceGroupName, newResourceGroup);
}

async function checkForValidResourcegroupName(resourceGroupName: string, resourceGroupClient: ResourceManagementClient): Promise<string> {
    let check = isValidAzureName(resourceGroupName);
    if (!check.isValid) { return check.message; }
    let resourceGroupStatus: boolean = await resourceGroupClient.resourceGroups.checkExistence(resourceGroupName);

    if (resourceGroupStatus) {
        return 'This resource group is already in use';
    }
    return undefined;

}
