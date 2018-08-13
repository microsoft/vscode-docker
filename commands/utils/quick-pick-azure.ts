import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
import { Registry } from 'azure-arm-containerregistry/lib/models';
import * as vscode from "vscode";
import { skus } from '../../constants'
import { ResourceGroup } from '../../node_modules/azure-arm-resource/lib/resource/models';
import { Subscription } from '../../node_modules/azure-arm-resource/lib/subscription/models';
import { UserCancelledError } from '../../node_modules/vscode-azureextensionui';
import * as acrTools from '../../utils/Azure/acrTools';
import { AzureImage } from "../../utils/Azure/models/image";
import { Repository } from "../../utils/Azure/models/Repository";
import { AzureUtilityManager } from '../../utils/azureUtilityManager';

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

export async function quickPickACRRegistry(canCreateNew?: boolean): Promise<Registry> {
    let registries = await AzureUtilityManager.getInstance().getRegistries();
    let reg: string[] = [];
    if (canCreateNew) { reg.push('+ Create new registry'); }
    for (let registryName of registries) {
        reg.push(registryName.name);
    }
    let desired: string = await vscode.window.showQuickPick(reg, {
        'canPickMany': false,
        'placeHolder': 'Choose the Registry from which your desired image exists'
    });

    if (!desired) {
        throw new UserCancelledError();
    } else if (canCreateNew && desired === reg[0]) {
        desired = String(await vscode.commands.executeCommand("vscode-docker.create-ACR-Registry"));
        registries = await AzureUtilityManager.getInstance().getRegistries(); // Reload
    }

    const registry = registries.find((currentReg): boolean => { return desired === currentReg.name });
    return registry;
}

export async function quickPickSKU(): Promise<string> {
    let sku: string;
    sku = await vscode.window.showQuickPick(skus, { 'canPickMany': false, 'placeHolder': 'Choose a SKU' });
    if (sku === undefined) { throw new UserCancelledError(); }
    return sku;
}

export async function quickPickSubscription(): Promise<Subscription> {
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
    subscriptionName = await vscode.window.showQuickPick(subsNames, {
        'canPickMany': false,
        'placeHolder': 'Choose a subscription to use'
    });
    if (subscriptionName === undefined) { throw new UserCancelledError(); }

    return subs.find(sub => { return sub.displayName === subscriptionName });
}

export async function quickPickLocation(subscription: Subscription): Promise<string> {
    let locations: SubscriptionModels.Location[] = await AzureUtilityManager.getInstance().getLocationsBySubscription(subscription);
    let locationNames: string[] = [];

    for (let loc of locations) {
        locationNames.push(loc.displayName);
    }

    locationNames.sort((loc1: string, loc2: string): number => {
        return loc1.localeCompare(loc2);
    });

    let location: string = await vscode.window.showQuickPick(locationNames, {
        'canPickMany': false,
        'placeHolder': 'Choose a Location to use'
    });
    if (location === undefined) { throw new Error('User exit'); }
    return location;
}

export async function acquireResourceGroup(canCreateNew?: boolean, subscription?: Subscription): Promise<ResourceGroup> {
    //Acquire each subscription's data simultaneously
    let resourceGroup;
    let resourceGroupName;
    let resourceGroups = await AzureUtilityManager.getInstance().getResourceGroups(subscription);

    let resourceGroupNames: string[] = [];
    if (canCreateNew) { resourceGroupNames.push('+ Create new resource group'); }
    for (let resGroupName of resourceGroups) {
        resourceGroupNames.push(resGroupName.name);
    }
    resourceGroupName = await vscode.window.showQuickPick(resourceGroupNames, {
        'canPickMany': false,
        'placeHolder': 'Choose a Resource Group to be used'
    });
    if (resourceGroupName === undefined) { throw new UserCancelledError(); }

    if (canCreateNew && resourceGroupName === '+ Create new resource group') {
        if (!subscription) {
            subscription = await quickPickSubscription();
        }
        let loc = await quickPickLocation(subscription);
        resourceGroupName = await createNewResourceGroup(loc, subscription);
    }
    resourceGroups = await AzureUtilityManager.getInstance().getResourceGroups(subscription);
    resourceGroup = resourceGroups.find(resGroup => { return resGroup.name === resourceGroupName; });

    if (!resourceGroupName) { vscode.window.showErrorMessage('You must select a valid resource group'); }
} while (!resourceGroupName) { ; }
    }
return resourceGroup;
}

/*Creates a new resource group within the current subscription */
async function createNewResourceGroup(loc: string, subscription?: Subscription): Promise<string> {
    const resourceGroupClient = AzureUtilityManager.getInstance().getResourceManagementClient(subscription);
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
