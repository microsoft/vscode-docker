import * as path from "path";
import * as vscode from "vscode";
import { reporter } from '../telemetry/telemetry';
import { DOCKERFILE_GLOB_PATTERN } from '../dockerExtension';
//import  = require('azure-arm-containerregistry');
import {RegistryType} from '../explorer/models/registryType';
import {AzureAccount, AzureSession} from '../typings/azure-account.api';
import { AzureRegistryNode } from '../explorer/models/azureRegistryNodes';
import {SubscriptionClient, ResourceManagementClient, SubscriptionModels} from 'azure-arm-resource';


const teleCmdId: string = 'vscode-docker.createRegistry';
const _azureAccount = AzureA

export async function createRegistry() {
    var opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        prompt: 'Registry name? '
    };

    const name: string = await vscode.window.showInputBox(opt);
    
    var opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        prompt: 'Location? '
    };

    const location: string = await vscode.window.showInputBox(opt);

    var opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        placeHolder: 'Basic',
        value: 'Basic',
        prompt: 'SKU? '
    };

    const sku: string = await vscode.window.showInputBox(opt);

    var opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        placeHolder: name,
        value: name,
        prompt: 'Resource Group? '
    };

    const resGroup: string = await vscode.window.showInputBox(opt);

    if (!this._azureAccount) {
        return;
    }
    const loggedIntoAzure: boolean = await this._azureAccount.waitForLogin()

    if (this._azureAccount.status === 'Initializing' || this._azureAccount.status === 'LoggingIn') {
        return;
    }

    if (this._azureAccount.status === 'LoggedOut') {
        return;
    }

    if (loggedIntoAzure) {            
        const subs: SubscriptionModels.Subscription[] = this.getFilteredSubscriptions();
        const client = new ContainerRegistryManagement(this.getCredentialByTenantId(subs[0].tenantId), subs[0].subscriptionId);
    }
}

function getFilteredSubscriptions(): SubscriptionModels.Subscription[] {

    if (this._azureAccount) {
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
    } else {
        return [];
    }
}
