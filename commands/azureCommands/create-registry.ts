
import * as vscode from "vscode";
import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
import { ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';
import { RegistryNameStatus } from "azure-arm-containerregistry/lib/models";
import { ResourceGroup } from "azure-arm-resource/lib/resource/models";
import { AzureCredentialsManager } from '../../utils/azureCredentialsManager';
import { reporter } from '../../telemetry/telemetry';
const teleAzureId: string = 'vscode-docker.create.registry.azureContainerRegistry';
const teleCmdId: string = 'vscode-docker.createRegistry';



export async function createRegistry() {
    let subscription: SubscriptionModels.Subscription;
    let resourceGroup: ResourceGroup;
    try {
        subscription = await acquireSubscription();
        resourceGroup = await acquireResourceGroup(subscription);
    } catch (error) {
        return;
    }
    const client = AzureCredentialsManager.getInstance().getContainerRegistryManagementClient(subscription);

    let registryName: string;
    try {
        registryName = await acquireRegistryName(client);
    } catch (error) {
        return;
    }

    const sku: string = await vscode.window.showInputBox({
        ignoreFocusOut: false,
        placeHolder: 'Basic',
        value: 'Basic',
        prompt: 'SKU? '
    });

    client.registries.beginCreate(resourceGroup.name, registryName, { 'sku': { 'name': sku }, 'location': resourceGroup.location }).then(function (response) {
        vscode.window.showInformationMessage(response.name + ' has been created succesfully!');
    }, function (error) {
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

async function acquireRegistryName(client: ContainerRegistryManagementClient) {
    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: false,
        prompt: 'Registry name? '
    };
    let registryName: string = await vscode.window.showInputBox(opt);

    let registryStatus: RegistryNameStatus = await client.registries.checkNameAvailability({ 'name': registryName });
    while (!registryStatus.nameAvailable) {
        opt = {
            ignoreFocusOut: false,
            prompt: "That registry name is unavailable. Try again: "
        }
        registryName = await vscode.window.showInputBox(opt);

        if (registryName === undefined) throw 'user Exit';

        registryStatus = await client.registries.checkNameAvailability({ 'name': registryName });
    }
    return registryName;
}

// INPUT HELPERS
async function acquireSubscription(): Promise<SubscriptionModels.Subscription> {
    let subscription: SubscriptionModels.Subscription;
    const subs = AzureCredentialsManager.getInstance().getFilteredSubscriptionList();

    let subsNames: string[] = [];
    for (let i = 0; i < subs.length; i++) {
        subsNames.push(subs[i].displayName);
    }
    let subscriptionName: string;
    do {
        subscriptionName = await vscode.window.showQuickPick(subsNames, { 'canPickMany': false, 'placeHolder': 'Choose a subscription to be used' });

        if (subscriptionName === undefined) throw 'User exit';
    } while (!subscriptionName);


    return subs.find(sub => { return sub.displayName === subscriptionName });
}

async function acquireResourceGroup(subscription: SubscriptionModels.Subscription): Promise<ResourceGroup> {
    //Acquire each subscription's data simultaneously
    let resourceGroup;
    let resourceGroupName;
    const resourceGroupClient = new ResourceManagementClient(AzureCredentialsManager.getInstance().getCredentialByTenantId(subscription.tenantId), subscription.subscriptionId);
    let resourceGroups = await AzureCredentialsManager.getInstance().getResourceGroups(subscription);

    let resourceGroupNames: string[] = [];
    resourceGroupNames.push('+ Create new resource group');
    for (let i = 0; i < resourceGroups.length; i++) {
        resourceGroupNames.push(resourceGroups[i].name);
    }

    do {
        resourceGroupName = await vscode.window.showQuickPick(resourceGroupNames, { 'canPickMany': false, 'placeHolder': 'Choose a Resource Group to be used' });
        if (resourceGroupName === undefined) throw 'user Exit';
        if (resourceGroupName === '+ Create new resource group') {
            resourceGroupName = await createNewResourceGroup(resourceGroupClient);
        }
        resourceGroups = await AzureCredentialsManager.getInstance().getResourceGroups(subscription);
        resourceGroup = resourceGroups.find(resGroup => { return resGroup.name === resourceGroupName; });

        if (!resourceGroupName) vscode.window.showErrorMessage('You must select a valid resource group');
    } while (!resourceGroupName);

    return resourceGroup;
}

async function createNewResourceGroup(resourceGroupClient: ResourceManagementClient): Promise<string> {

    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: false,
        prompt: 'Resource group name? '
    };
    let resourceGroupName: string = await vscode.window.showInputBox(opt);
    let resourceGroupStatus: boolean = await resourceGroupClient.resourceGroups.checkExistence(resourceGroupName);
    while (resourceGroupStatus) {
        opt = {
            ignoreFocusOut: false,
            prompt: "That resource group name is already in existence. Try again: "
        }
        resourceGroupName = await vscode.window.showInputBox(opt);
        if (resourceGroupName === undefined) throw 'user Exit';
        resourceGroupStatus = await resourceGroupClient.resourceGroups.checkExistence(resourceGroupName);
    }

    let newResourceGroup: ResourceGroup = {
        name: resourceGroupName,
        location: 'West US',
    };
    //Potential error when two clients try to create same resource group name at once
    try {
        await resourceGroupClient.resourceGroups.createOrUpdate(resourceGroupName, newResourceGroup);
    } catch (error) {
        vscode.window.showErrorMessage(error.message);
    }

    return resourceGroupName;
}




