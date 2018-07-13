
import { SubscriptionClient, ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';
import { AzureAccount } from '../typings/azure-account.api';
import { ServiceClientCredentials } from 'ms-rest';
import { AsyncPool } from '../explorer/utils/asyncpool';
import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
import { AzureAccountWrapper } from '.././explorer/deploy/azureAccountWrapper';
import { RegistryRootNode } from "../explorer/models/registryRootNode";
import { RegistryNameStatus } from "azure-arm-containerregistry/lib/models";
import * as ContainerModels from '../node_modules/azure-arm-containerregistry/lib/models';
import { ResourceGroup, ResourceGroupListResult } from "azure-arm-resource/lib/resource/models";

const MAX_CONCURRENT_REQUESTS = 8;
const MAX_CONCURRENT_SUBSCRIPTON_REQUESTS = 5;

export class AzureCredentialsManager {

    private static _instance: AzureCredentialsManager = new AzureCredentialsManager();
    private azureAccount: AzureAccount;
    constructor() {
        if (AzureCredentialsManager._instance) {
            throw new Error("Error: Instantiation failed: Use SingletonClass.getInstance() instead of new.");
        }
        AzureCredentialsManager._instance = this;
    }

    public static getInstance(): AzureCredentialsManager {
        return AzureCredentialsManager._instance;
    }

    public setAccount(azureAccount) {
        this.azureAccount = azureAccount;
    }

    public getAccount() {
        return this.azureAccount;
    }

    public getFilteredSubscriptionList(): SubscriptionModels.Subscription[] {
        return this.azureAccount.filters.map<SubscriptionModels.Subscription>(filter => {
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

    public getContainerRegistryManagementClient(subscription: SubscriptionModels.Subscription): ContainerRegistryManagementClient {
        return new ContainerRegistryManagementClient(this.getCredentialByTenantId(subscription.tenantId), subscription.subscriptionId);
    }

    public async getRegistries(subscription?: SubscriptionModels.Subscription, resourceGroup?: string, sortFunction?): Promise<ContainerModels.Registry[]> {
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

            for (let i = 0; i < subs.length; i++) {
                subPool.addTask(async () => {
                    const client = new ContainerRegistryManagementClient(this.getCredentialByTenantId(subs[i].tenantId), subs[i].subscriptionId);
                    let registry: ContainerModels.Registry[] = await client.registries.list();
                    registries = registries.concat(registry);
                });
            }
            await subPool.scheduleRun();
        }

        if (sortFunction) {
            registries.sort(sortFunction);
        }

        return registries;
    }

    public async getResourceGroups(subscription?: SubscriptionModels.Subscription): Promise<ResourceGroup[]> {
        if (subscription) {
            const resourceClient = new ResourceManagementClient(this.getCredentialByTenantId(subscription.tenantId), subscription.subscriptionId);
            return await resourceClient.resourceGroups.list();
        }
        const subs = this.getFilteredSubscriptionList();
        const subPool = new AsyncPool(MAX_CONCURRENT_SUBSCRIPTON_REQUESTS);
        let resourceGroups: ResourceGroup[] = [];
        //Acquire each subscription's data simultaneously
        for (let i = 0; i < subs.length; i++) {
            subscription = subs[i];
            subPool.addTask(async () => {
                const resourceClient = new ResourceManagementClient(this.getCredentialByTenantId(subscription.tenantId), subscription.subscriptionId);
                const internalGroups = await resourceClient.resourceGroups.list();
                resourceGroups = resourceGroups.concat(internalGroups);
            });
        }
        await subPool.scheduleRun();
        return resourceGroups;
    }

    public getCredentialByTenantId(tenantId: string): ServiceClientCredentials {

        const session = this.azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());

        if (session) {
            return session.credentials;
        }

        throw new Error(`Failed to get credentials, tenant ${tenantId} not found.`);
    }

    private async checkLogin() {
        if (!this.azureAccount) {
            throw 'Azure Account not provided, this computer may be missing the Azure account extension or you may have forgotten to call setAccount ';
        }

        const loggedIntoAzure: boolean = await this.azureAccount.waitForLogin();

        if (this.azureAccount.status === 'Initializing' || this.azureAccount.status === 'LoggingIn') {
            throw 'Azure account is logging in'
        }

        if (this.azureAccount.status === 'LoggedOut') {
            throw 'User is not logged into Azure account'
        }

        if (loggedIntoAzure) {

        }
    }
}

