
import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
import { RegistryNameStatus } from "azure-arm-containerregistry/lib/models";
import { ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';
import { ResourceGroup } from "azure-arm-resource/lib/resource/models";
import * as vscode from "vscode";
import { reporter } from '../../telemetry/telemetry';
import { AzureUtilityManager } from '../../utils/azureUtilityManager';
const teleAzureId: string = 'vscode-docker.create.registry.azureContainerRegistry';
const teleCmdId: string = 'vscode-docker.createRegistry';
import * as opn from 'opn';

/* Creates a new registry based on user input/selection of features, such as location */
export async function createRegistry(): Promise<void> {
    let subscription: SubscriptionModels.Subscription;
    let resourceGroup: ResourceGroup;
    let location: string;

    try {
        subscription = await acquireSubscription();
        resourceGroup = await acquireResourceGroup(subscription);

    } catch (error) {
        return;
    }
    const client = AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);

    let registryName: string;
    try {
        registryName = await acquireRegistryName(client);
    } catch (error) {
        return;
    }

    const sku: string = await acquireSKU();
    location = await acquireLocation(resourceGroup, subscription);

    client.registries.beginCreate(resourceGroup.name, registryName, { 'sku': { 'name': sku }, 'location': location }).then((response): void => {
        vscode.window.showInformationMessage(response.name + ' has been created succesfully!');
    }, (error): void => {
        vscode.window.showErrorMessage(error.message);
    })

    //Acquiring telemetry data here
    if (reporter) {
        /* __GDPR__
           "command" : {
              "command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
           }
         */
        reporter.sendTelemetryEvent('command', {
            command: teleCmdId
        });

        if (registryName.toLowerCase().indexOf('azurecr.io')) {
            /* __GDPR__
               "command" : {
                  "command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
               }
             */
            reporter.sendTelemetryEvent('command', {
                command: teleAzureId
            });
        }
    }

}

// INPUT HELPERS
async function acquireSKU(): Promise<string> {
    let skus: string[] = ["Basic", "Standard", "Premium"];
    let sku: string;
    sku = await vscode.window.showQuickPick(skus, { 'canPickMany': false, 'placeHolder': 'Choose a SKU' });
    if (sku === undefined) { throw new Error('User exit'); }

    return sku;
}

async function acquireRegistryName(client: ContainerRegistryManagementClient): Promise<string> {
    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: false,
        prompt: 'Registry name? '
    };
    let registryName: string = await vscode.window.showInputBox(opt);

    let registryStatus: RegistryNameStatus = await client.registries.checkNameAvailability({ 'name': registryName });
    while (!registryStatus.nameAvailable) {
        opt = {
            ignoreFocusOut: false,
            prompt: `The registry name '${registryName}' is unavailable. Try again: `
        }
        registryName = await vscode.window.showInputBox(opt);

        if (registryName === undefined) { throw new Error('user Exit'); }
        registryStatus = await client.registries.checkNameAvailability({ 'name': registryName });
    }
    return registryName;
}

async function acquireSubscription(): Promise<SubscriptionModels.Subscription> {
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

async function acquireResourceGroup(subscription: SubscriptionModels.Subscription): Promise<ResourceGroup> {
    //Acquire each subscription's data simultaneously
    let resourceGroup;
    let resourceGroupName;
    const resourceGroupClient = new ResourceManagementClient(AzureUtilityManager.getInstance().getCredentialByTenantId(subscription.tenantId), subscription.subscriptionId);
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
