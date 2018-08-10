import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
import * as ContainerModels from 'azure-arm-containerregistry/lib/models';
import { ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';
import { ResourceGroup } from "azure-arm-resource/lib/resource/models";
import { ServiceClientCredentials } from 'ms-rest';
import { MAX_CONCURRENT_SUBSCRIPTON_REQUESTS } from '../constants';
import { AzureAccount } from '../typings/azure-account.api';
import { AsyncPool } from './asyncpool';

/* Singleton for facilitating communication with Azure account services by providing extended shared
  functionality and extension wide access to azureAccount. Tool for internal use.
  Authors: Esteban Rey L, Jackson Stokes
*/

export class AzureUtilityManager {

    //SETUP
    private static _instance: AzureUtilityManager;
    private azureAccount: AzureAccount;

    private constructor() { }

    public static getInstance(): AzureUtilityManager {
        if (!AzureUtilityManager._instance) { // lazy initialization
            AzureUtilityManager._instance = new AzureUtilityManager();
        }
        return AzureUtilityManager._instance;
    }

    //This function has to be called explicitly before using the singleton.
    public setAccount(azureAccount: AzureAccount): void {
        this.azureAccount = azureAccount;
    }

    //GETTERS
    public getAccount(): AzureAccount {
        if (this.azureAccount) { return this.azureAccount; }
        throw new Error('Azure account is not present, you may have forgotten to call setAccount');
    }

    public getFilteredSubscriptionList(): SubscriptionModels.Subscription[] {
        return this.getAccount().filters.map<SubscriptionModels.Subscription>(filter => {
            return {
                id: filter.subscription.id,
                subscriptionId: filter.subscription.subscriptionId,
                tenantId: filter.session.tenantId,
                displayName: filter.subscription.displayName,
                state: filter.subscription.state,
                subscriptionPolicies: filter.subscription.subscriptionPolicies,
                authorizationSource: filter.subscription.authorizationSource
            };
        });
    }

    public getContainerRegistryManagementClient(subscription: SubscriptionModels.Subscription): ContainerRegistryManagementClient {
        return new ContainerRegistryManagementClient(this.getCredentialByTenantId(subscription.tenantId), subscription.subscriptionId);
    }

    public getResourceManagementClient(subscription: SubscriptionModels.Subscription): ResourceManagementClient {
        return new ResourceManagementClient(this.getCredentialByTenantId(subscription.tenantId), subscription.subscriptionId);
    }

    public async getRegistries(subscription?: SubscriptionModels.Subscription, resourceGroup?: string, sortFunction?: (a: ContainerModels.Registry, b: ContainerModels.Registry) => number): Promise<ContainerModels.Registry[]> {
        let registries: ContainerModels.Registry[] = [];

        if (subscription && resourceGroup) {
            //Get all registries under one resourcegroup
            const client = this.getContainerRegistryManagementClient(subscription);
            registries = await client.registries.listByResourceGroup(resourceGroup);

        } else if (subscription) {
            //Get all registries under one subscription
            const client = this.getContainerRegistryManagementClient(subscription);
            registries = await client.registries.list();

        } else {
            //Get all registries for all subscriptions
            const subs: SubscriptionModels.Subscription[] = this.getFilteredSubscriptionList();
            const subPool = new AsyncPool(MAX_CONCURRENT_SUBSCRIPTON_REQUESTS);

            for (let sub of subs) {
                subPool.addTask(async () => {
                    const client = this.getContainerRegistryManagementClient(sub);
                    let subscriptionRegistries: ContainerModels.Registry[] = await client.registries.list();
                    registries = registries.concat(subscriptionRegistries);
                });
            }
            await subPool.runAll();
        }

        if (sortFunction && registries.length > 1) {
            registries.sort(sortFunction);
        }

        return registries;
    }

    public async getResourceGroups(subscription?: SubscriptionModels.Subscription): Promise<ResourceGroup[]> {
        if (subscription) {
            const resourceClient = this.getResourceManagementClient(subscription);
            return await resourceClient.resourceGroups.list();
        }
        const subs = this.getFilteredSubscriptionList();
        const subPool = new AsyncPool(MAX_CONCURRENT_SUBSCRIPTON_REQUESTS);
        let resourceGroups: ResourceGroup[] = [];
        //Acquire each subscription's data simultaneously
        for (let sub of subs) {
            subPool.addTask(async () => {
                const resourceClient = this.getResourceManagementClient(sub);
                const internalGroups = await resourceClient.resourceGroups.list();
                resourceGroups = resourceGroups.concat(internalGroups);
            });
        }
        await subPool.runAll();
        return resourceGroups;
    }

    public getCredentialByTenantId(tenantId: string): ServiceClientCredentials {

        const session = this.getAccount().sessions.find((azureSession) => azureSession.tenantId.toLowerCase() === tenantId.toLowerCase());

        if (session) {
            return session.credentials;
        }

        throw new Error(`Failed to get credentials, tenant ${tenantId} not found.`);
    }

    //CHECKS
    //Provides a unified check for login that should be called once before using the rest of the singletons capabilities
    public async waitForLogin(): Promise<boolean> {
        if (!this.azureAccount) {
            return false;
        }
        return await this.azureAccount.waitForLogin();
    }
}
