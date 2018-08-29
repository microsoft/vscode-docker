/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
import { Registry } from 'azure-arm-containerregistry/lib/models';
import * as ContainerModels from 'azure-arm-containerregistry/lib/models';
import { ResourceManagementClient, SubscriptionClient, SubscriptionModels } from 'azure-arm-resource';
import { ResourceGroup } from "azure-arm-resource/lib/resource/models";
import { ServiceClientCredentials } from 'ms-rest';
import { addExtensionUserAgent } from 'vscode-azureextensionui';
import { MAX_CONCURRENT_SUBSCRIPTON_REQUESTS } from '../constants';
import { AzureAccount, AzureSession } from '../typings/azure-account.api';
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

    public static hasLoadedUtilityManager(): boolean {
        if (AzureUtilityManager._instance) { return true; } else { return false; }
    }

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

    public getSession(subscription: SubscriptionModels.Subscription): AzureSession {
        const tenantId: string = subscription.tenantId;
        const azureAccount: AzureAccount = this.getAccount();
        return azureAccount.sessions.find((s) => s.tenantId.toLowerCase() === tenantId.toLowerCase());
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
        let client = new ContainerRegistryManagementClient(this.getCredentialByTenantId(subscription.tenantId), subscription.subscriptionId);
        addExtensionUserAgent(client);
        return client;
    }

    public getResourceManagementClient(subscription: SubscriptionModels.Subscription): ResourceManagementClient {
        return new ResourceManagementClient(this.getCredentialByTenantId(subscription.tenantId), subscription.subscriptionId);
    }

    public async getRegistries(subscription?: SubscriptionModels.Subscription, resourceGroup?: string,
        compareFn: (a: ContainerModels.Registry, b: ContainerModels.Registry) => number = this.sortRegistriesAlphabetically): Promise<ContainerModels.Registry[]> {

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

        registries.sort(compareFn);

        //Return only non classic registries
        return registries.filter((registry) => { return !registry.sku.tier.includes('Classic') });
    }

    private sortRegistriesAlphabetically(a: ContainerModels.Registry, b: ContainerModels.Registry): number {
        return a.loginServer.localeCompare(b.loginServer);
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

    public async getLocationsBySubscription(subscription: SubscriptionModels.Subscription): Promise<SubscriptionModels.Location[]> {
        const credential = this.getCredentialByTenantId(subscription.tenantId);
        const client = new SubscriptionClient(credential);
        const locations = <SubscriptionModels.Location[]>(await client.subscriptions.listLocations(subscription.subscriptionId));
        return locations;
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
