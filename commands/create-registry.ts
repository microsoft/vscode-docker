
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

export async function createRegistry(context ?: RegistryRootNode) {
    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        prompt: 'Registry name? '
    };

    let registryName: string = await vscode.window.showInputBox(opt);
    (registryName);

    opt = {
        ignoreFocusOut: true,
        prompt: 'Location? '
    };

    const location: string = await vscode.window.showInputBox(opt);

    opt = {
        ignoreFocusOut: true,
        placeHolder: 'Basic',
        value: 'Basic',
        prompt: 'SKU? '
    };

    const sku: string = await vscode.window.showInputBox(opt);

    opt = {
        ignoreFocusOut: true,
        placeHolder: registryName,
        value: registryName,
        prompt: 'Resource Group? '
    };

    let resourceGroup: string = await vscode.window.showInputBox(opt);
    let azureAccount = context.azureAccount;
    if (!azureAccount) {
        return; 
    }

    if (azureAccount.status === 'LoggedOut') {
        return;
    }      
        const subs: SubscriptionModels.Subscription[] = getFilteredSubscriptions(azureAccount);
        //Acquire each subscription's data simultaneously
        const client = new ContainerRegistryManagementClient (getCredentialByTenantId(subs[0].tenantId,azureAccount), subs[0].subscriptionId);
        const resourceclient=new ResourceManagementClient(getCredentialByTenantId(subs[0].tenantId, azureAccount), subs[0].subscriptionId);
        
        //check to make sure resource group name provided actually exists
      
        // make sure the registry name entered is possible
        let x : RegistryNameStatus = await client.registries.checkNameAvailability({'name':registryName});
        while(!x.nameAvailable){
            opt={
                ignoreFocusOut: true,
                prompt: "Invalid registry name. Try again: "
            }
            registryName=await vscode.window.showInputBox(opt);
            x = await client.registries.checkNameAvailability({'name':registryName});

        }

        let exist=await resourceclient.resourceGroups.checkExistence(resourceGroup);
        while(!exist){
            opt={
                ignoreFocusOut: true,
                placeHolder: registryName,
                value: registryName,
                prompt: 'That Resource Group does not exist. Try again? '
            }
            resourceGroup=await vscode.window.showInputBox(opt);
            exist=await resourceclient.resourceGroups.checkExistence(resourceGroup);
            if(exist){console.log("exists")};
            if(!exist) {
                console.log("doesn't exist")
            };
        }
        await client.registries.beginCreate(resourceGroup,registryName,{'sku':{'name':sku},'location':location}).then(function(response){
            console.log("Success!", response);
        }, function(error){
            console.error("Failed!", error);
        })
        console.log(registryName);
}

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
