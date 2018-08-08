import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
import { Registry } from 'azure-arm-containerregistry/lib/models';
import * as opn from 'opn';
import * as vscode from "vscode";
import { ResourceGroup } from '../../node_modules/azure-arm-resource/lib/resource/models';
import { Subscription } from '../../node_modules/azure-arm-resource/lib/subscription/models';
import * as acrTools from '../../utils/Azure/acrTools';
import { AzureImage } from "../../utils/Azure/models/image";
import { Repository } from "../../utils/Azure/models/Repository";
import { AzureUtilityManager } from '../../utils/azureUtilityManager';

import { ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';

/**
 * function to allow user to pick a desired image for use
 * @param repository the repository to look in
 * @returns an AzureImage object (see azureUtils.ts)
 */
export async function quickPickACRImage(repository: Repository): Promise<AzureImage> {
    const repoImages: AzureImage[] = await acrTools.getAzureImages(repository);
    let imageListNames: string[] = [];
    for (let tempImage of repoImages) {
        imageListNames.push(tempImage.tag);
    }
    let desiredImage = await vscode.window.showQuickPick(imageListNames, { 'canPickMany': false, 'placeHolder': 'Choose the image you want to delete' });
    if (!desiredImage) { return; }
    const image = repoImages.find((myImage): boolean => { return desiredImage === myImage.tag });
    return image;
}

/**
 * function to allow user to pick a desired repository for use
 * @param registry the registry to choose a repository from
 * @returns a Repository object (see azureUtils.ts)
 */
export async function quickPickACRRepository(registry: Registry): Promise<Repository> {
    const myRepos: Repository[] = await acrTools.getAzureRepositories(registry);
    let rep: string[] = [];
    for (let repo of myRepos) {
        rep.push(repo.name);
    }
    let desiredRepo = await vscode.window.showQuickPick(rep, { 'canPickMany': false, 'placeHolder': 'Choose the repository from which your desired image exists' });
    if (!desiredRepo) { return; }
    const repository = myRepos.find((currentRepo): boolean => { return desiredRepo === currentRepo.name });
    return repository;
}

/**
 * function to let user choose a registry for use
 * @returns a Registry object
 */
export async function quickPickACRRegistry(subscription?: Subscription, resourceGroup?: string): Promise<Registry> {
    //first get desired registry
    let registries = await AzureUtilityManager.getInstance().getRegistries(subscription, resourceGroup);
    let reg: string[] = [];
    for (let registryName of registries) {
        reg.push(registryName.name);
    }
    let desired = await vscode.window.showQuickPick(reg, { 'canPickMany': false, 'placeHolder': 'Choose the Registry from which your desired image exists' });
    if (!desired) { return; }
    const registry = registries.find((currentReg): boolean => { return desired === currentReg.name });
    return registry;
}

export async function acquireResourceGroup(subscription: Subscription, resourceGroupClient: ResourceManagementClient): Promise<ResourceGroup> {
    //Acquire each subscription's data simultaneously
    let resourceGroup;
    let resourceGroupName;
    //const resourceGroupClient = new ResourceManagementClient(AzureUtilityManager.getInstance().getCredentialByTenantId(subscription.tenantId), subscription.subscriptionId);
    let resourceGroups = await AzureUtilityManager.getInstance().getResourceGroups(subscription);

    let resourceGroupNames: string[] = [];
    resourceGroupNames.push('+ Create new resource group');
    for (let resGroupName of resourceGroups) {
        resourceGroupNames.push(resGroupName.name);
    }

    do {
        resourceGroupName = await vscode.window.showQuickPick(resourceGroupNames, { 'canPickMany': false, 'placeHolder': 'Choose a Resource Group to be used' });
        if (resourceGroupName === undefined) { throw new Error('user Exit'); }
        if (resourceGroupName === '+ Create new resource group') {
            let loc = await acquireLocation(resourceGroup, subscription);
            resourceGroupName = await createNewResourceGroup(loc, resourceGroupClient);
        }
        resourceGroups = await AzureUtilityManager.getInstance().getResourceGroups(subscription);
        resourceGroup = resourceGroups.find(resGroup => { return resGroup.name === resourceGroupName; });

        if (!resourceGroupName) { vscode.window.showErrorMessage('You must select a valid resource group'); }
    } while (!resourceGroupName);
    return resourceGroup;
}

async function acquireLocation(resourceGroup: ResourceGroup, subscription: SubscriptionModels.Subscription): Promise<string> {
    let locations: SubscriptionModels.Location[] = await AzureUtilityManager.getInstance().getLocationsBySubscription(subscription);
    let locationNames: string[] = [];
    let placeHolder: string;

    for (let loc of locations) {
        locationNames.push(loc.displayName);
    }

    locationNames.sort((loc1: string, loc2: string): number => {
        return loc1.localeCompare(loc2);
    });

    if (resourceGroup === undefined) {
        placeHolder = "Choose location for your new resource group";
    } else {
        placeHolder = resourceGroup.location;

        //makes placeholder the Display Name version of the location's name
        locations.forEach((locObj: SubscriptionModels.Location): string => {
            if (locObj.name === resourceGroup.location) {
                placeHolder = locObj.displayName;
                return;
            }
        });
    }
    let location: string;
    do {
        location = await vscode.window.showQuickPick(locationNames, { 'canPickMany': false, 'placeHolder': placeHolder });
        if (location === undefined) { throw new Error('User exit'); }
    } while (!location);
    return location;
}

/*Creates a new resource group within the current subscription */
async function createNewResourceGroup(loc: string, resourceGroupClient: ResourceManagementClient): Promise<string> {
    let promptMessage = 'Resource group name?';

    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: false,
        prompt: promptMessage
    };

    let resourceGroupName: string;
    let resourceGroupStatus: boolean;

    while (opt.prompt) {
        resourceGroupName = await vscode.window.showInputBox(opt);
        resourceGroupStatus = await resourceGroupClient.resourceGroups.checkExistence(resourceGroupName);
        if (!resourceGroupStatus) {
            opt.prompt = null;
        } else {
            opt.prompt = `The resource group '${resourceGroupName}' already exists. Try again: `;
        }
    }

    let newResourceGroup: ResourceGroup = {
        name: resourceGroupName,
        location: loc,
    };

    //Potential error when two clients try to create same resource group name at once
    try {
        await resourceGroupClient.resourceGroups.createOrUpdate(resourceGroupName, newResourceGroup);
    } catch (error) {
        vscode.window.showErrorMessage(`The resource group '${resourceGroupName}' already exists. Try again: `);
    }
    return resourceGroupName;
}

export async function acquireSubscription(): Promise<SubscriptionModels.Subscription> {
    const subs = AzureUtilityManager.getInstance().getFilteredSubscriptionList();
    if (subs.length === 0) {
        vscode.window.showErrorMessage("You do not have any subscriptions. You can create one in your Azure Portal", "Open Portal").then(val => {
            if (val === "Open Portal") {
                opn('https://portal.azure.com/');
            }
        });
    }

    let subsNames: string[] = [];
    for (let sub of subs) {
        subsNames.push(sub.displayName);
    }
    let subscriptionName: string;
    subscriptionName = await vscode.window.showQuickPick(subsNames, { 'canPickMany': false, 'placeHolder': 'Choose a subscription to be used' });
    if (subscriptionName === undefined) { throw new Error('User exit'); }

    return subs.find(sub => { return sub.displayName === subscriptionName });
}
