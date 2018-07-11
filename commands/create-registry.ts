
import * as vscode from "vscode";
import {ContainerRegistryManagementClient} from 'azure-arm-containerregistry';
import { AzureAccountWrapper } from '.././explorer/deploy/azureAccountWrapper';
import { SubscriptionClient, ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';
import {AzureAccount, AzureSession} from '../typings/azure-account.api';
import {accountProvider} from '../dockerExtension';
import { RegistryRootNode } from "../explorer/models/registryRootNode";
import { ServiceClientCredentials } from 'ms-rest';
import { RegistryNameStatus } from "azure-arm-containerregistry/lib/models";
const teleCmdId: string = 'vscode-docker.createRegistry';
import { asyncPool } from '../explorer/utils/asyncpool';
import { ResourceGroup, ResourceGroupListResult } from "azure-arm-resource/lib/resource/models";


export async function createRegistry(context ?: RegistryRootNode) {
    
    let azureAccount = context.azureAccount;
    if (!azureAccount) {
        return; 
    }

    if (azureAccount.status === 'LoggedOut') {
        return;
    }
  
    let subscription : SubscriptionModels.Subscription = await acquireSubscription(azureAccount);
    let resourceGroup : ResourceGroup = await acquireResourceGroup(subscription,azureAccount);

    const client = new ContainerRegistryManagementClient(getCredentialByTenantId(subscription.tenantId, azureAccount), subscription.subscriptionId);
    let registryName = await acquireRegistryName(client);

    const sku: string = await vscode.window.showInputBox({
        ignoreFocusOut: true,
        placeHolder: 'Basic',
        value: 'Basic',
        prompt: 'SKU? '
    });
   
    client.registries.beginCreate(resourceGroup.name,registryName,{'sku':{'name':sku},'location':resourceGroup.location}).then(function(response){
        vscode.window.showInformationMessage(response.name + ' has been created succesfully!');
    }, function(error){
        vscode.window.showErrorMessage(error);
    })

}

// INPUT HELPERS
async function acquireSubscription(azureAccount): Promise<SubscriptionModels.Subscription>{
    const subs: SubscriptionModels.Subscription[] = getFilteredSubscriptions(azureAccount);
    let subsNames: string[] = [];
    for(let i = 0; i < subs.length; i++){
        subsNames.push(subs[i].displayName);
    }
    let subscriptionName:string;
    do{
        subscriptionName = await vscode.window.showQuickPick(subsNames, {'canPickMany': false,'placeHolder':'Choose a subscription to be used'});
    } while(!subscriptionName);
     
    return subs.find(sub=>{return sub.displayName === subscriptionName});
}

async function acquireResourceGroup(subscription:SubscriptionModels.Subscription, azureAccount):Promise<ResourceGroup>{
     //Acquire each subscription's data simultaneously
     const resourceClient = new ResourceManagementClient(getCredentialByTenantId(subscription.tenantId, azureAccount), subscription.subscriptionId);
     const resourceGroups = await resourceClient.resourceGroups.list();
     let resourceGroupNames: string[] = [];
     for(let i = 0; i < resourceGroups.length; i++){
         resourceGroupNames.push(resourceGroups[i].name);
     }
     let resourceGroup;
     let resourceGroupName;
     do{
         resourceGroupName = await vscode.window.showQuickPick(resourceGroupNames, {'canPickMany': false, 'placeHolder':'Choose a Resource Group to be used'});
         resourceGroup = resourceGroups.find(resGroup=>{return resGroup.name === resourceGroupName});
 
         if(!resourceGroupName){
             vscode.window.showErrorMessage('You must select a valid resource group');
         }
 
     } while(!resourceGroupName);
     return resourceGroup;
}

async function acquireRegistryName(client:ContainerRegistryManagementClient){
    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        prompt: 'Registry name? '
    };
    let registryName: string = await vscode.window.showInputBox(opt);

    let registryStatus : RegistryNameStatus = await client.registries.checkNameAvailability({'name':registryName});
    while(!registryStatus.nameAvailable){
        opt={
            ignoreFocusOut: true,
            prompt: "That registry name is unavailable. Try again: "
        }
        registryName = await vscode.window.showInputBox(opt);
        registryStatus = await client.registries.checkNameAvailability({'name':registryName});
    }
    return registryName;
}

// CREDENTIAL HELPERS
function getFilteredSubscriptions(azureAccount:AzureAccount): SubscriptionModels.Subscription[] {
        return azureAccount.filters.map<SubscriptionModels.Subscription>(filter => {
            return {
                id: filter.subscription.id,
                session: filter.session,
                subscriptionId: filter.subscription.subscriptionId,
                tenantId: filter.session.tenantId,
                displayName: filter.subscription.displayName,
                state: filter.subscription.state,
                subscriptionPolicies: filter.subscription.subscriptionPolicies,
                authorizationSource: filter.subscription.authorizationSource
            };
        });
}

function getCredentialByTenantId(tenantId: string,azureAccount:AzureAccount): ServiceClientCredentials {

    const session = azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());

    if (session) {
        return session.credentials;
    }

    throw new Error(`Failed to get credentials, tenant ${tenantId} not found.`);
}
