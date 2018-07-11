
import * as vscode from "vscode";
import {ContainerRegistryManagementClient} from 'azure-arm-containerregistry';
import { AzureAccountWrapper } from '.././explorer/deploy/azureAccountWrapper';
import { SubscriptionClient, ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';
import {AzureAccount, AzureSession} from '../typings/azure-account.api';
import {accountProvider} from '../dockerExtension';
import { RegistryRootNode } from "../explorer/models/registryRootNode";
import { ServiceClientCredentials } from 'ms-rest';
import { RegistryNameStatus, RegistryListResult } from "azure-arm-containerregistry/lib/models";
const teleCmdId: string = 'vscode-docker.deleteRegistry';

export async function deleteRegistry(context ?: RegistryRootNode) {
    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        placeHolder: 'No',
        value: 'No',
        prompt: 'Are you sure you want to delete this registry and its associated images? Enter Y or N: '
    };
   let answer=await vscode.window.showInputBox(opt);
   if(answer=='N'||answer=='n'){return};
   
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
        let reg: RegistryListResult=await client.registries.list();
        let resourceGroupName: string;
        for(let i=0; i<reg.length; i++){
            if (reg[i].name===context.label){
                resourceGroupName = client.registries[i].id.slice(client.registries[i].id.search('resourceGroups/') + 'resourceGroups/'.length, client.registries[i].id.search('/providers/'));
                break;
            }
        }
    
console.log(resourceGroupName);
        await client.registries.beginDeleteMethod(resourceGroupName, context.label).then(function(response){
            console.log("Success!", response);
        }, function(error){
            console.error("Failed!", error);
        })

        const resourceclient=new ResourceManagementClient(getCredentialByTenantId(subs[0].tenantId, azureAccount), subs[0].subscriptionId);
        
        //check to make sure resource group name provided actually exists
      
        // make sure the registry name entered is possible
        
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
