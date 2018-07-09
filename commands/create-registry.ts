
import * as vscode from "vscode";
import {ContainerRegistryManagementClient} from 'azure-arm-containerregistry';
import { AzureAccountWrapper } from '.././explorer/deploy/azureAccountWrapper';
import { SubscriptionClient, ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';
import {AzureAccount, AzureSession} from '../typings/azure-account.api';
import {accountProvider} from '../dockerExtension';
import { RegistryRootNode } from "../explorer/models/registryRootNode";
import { ServiceClientCredentials } from 'ms-rest';

const teleCmdId: string = 'vscode-docker.createRegistry';

export async function createRegistry(context ?: RegistryRootNode) {
    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        prompt: 'Registry name? '
    };

    const registryName: string = await vscode.window.showInputBox(opt);
    
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

    const resourceGroup: string = await vscode.window.showInputBox(opt);
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














//     if (this._azureAccount.status === 'Initializing' || this._azureAccount.status === 'LoggingIn') {
//         return;
//     }

//     if (this._azureAccount.status === 'LoggedOut') {
//         return;
//     }

//     if (loggedIntoAzure) {            
//         const subs: SubscriptionModels.Subscription[] = this.getFilteredSubscriptions();
//         const client = new ContainerRegistryManagement(this.getCredentialByTenantId(subs[0].tenantId), subs[0].subscriptionId);
//     }
    
// }

// function getFilteredSubscriptions(): SubscriptionModels.Subscription[] {

//     if (this._azureAccount) {
//         return azureAccount.filters.map<SubscriptionModels.Subscription>(filter => {
//             return {
//                 id: filter.subscription.id,
//                 session: filter.session,
//                 subscriptionId: filter.subscription.subscriptionId,
//                 tenantId: filter.session.tenantId,
//                 displayName: filter.subscription.displayName,
//                 state: filter.subscription.state,
//                 subscriptionPolicies: filter.subscription.subscriptionPolicies,
//                 authorizationSource: filter.subscription.authorizationSource
//             };
//         });
//     } else {
//         return [];
//     }

