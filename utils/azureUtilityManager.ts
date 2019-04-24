/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
import * as ContainerModels from 'azure-arm-containerregistry/lib/models';
import { ResourceManagementClient, SubscriptionClient, SubscriptionModels } from 'azure-arm-resource';
import { ResourceGroup } from "azure-arm-resource/lib/resource/models";
import { Subscription } from 'azure-arm-resource/lib/subscription/models';
import { ServiceClientCredentials } from 'ms-rest';
import * as vscode from 'vscode';
import { addExtensionUserAgent, callWithTelemetryAndErrorHandling, IActionContext, parseError, UserCancelledError } from 'vscode-azureextensionui';
import { MAX_CONCURRENT_SUBSCRIPTON_REQUESTS } from '../constants';
import { openExternal } from '../explorer/utils/openExternal';
import { AzureAccount, AzureSession } from '../typings/azure-account.api';
import { AsyncPool } from './asyncpool';
import { getSubscriptionId, getTenantId } from './nonNull';

/* Singleton for facilitating communication with Azure account services by providing extended shared
  functionality and extension wide access to azureAccount. Tool for internal use.
  Authors: Esteban Rey L, Jackson Stokes, Julia Lieberman
*/

export class AzureUtilityManager {
    private static _instance: AzureUtilityManager;
    private _azureAccountPromise: Promise<AzureAccount>;

    private constructor() { }

    private async loadAzureAccountExtension(): Promise<AzureAccount> {
        let azureAccount: AzureAccount | undefined;

        // tslint:disable-next-line:no-function-expression
        await callWithTelemetryAndErrorHandling('docker.loadAzureAccountExt', async function (this: IActionContext): Promise<void> {
            this.properties.isActivationEvent = 'true';

            try {
                let azureAccountExtension = vscode.extensions.getExtension<AzureAccount>('ms-vscode.azure-account');
                this.properties.found = azureAccountExtension ? 'true' : 'false';
                if (azureAccountExtension) {
                    azureAccount = await azureAccountExtension.activate();
                }

                vscode.commands.executeCommand('setContext', 'isAzureAccountInstalled', !!azureAccount);
            } catch (error) {
                throw new Error('Failed to activate the Azure Account Extension: ' + parseError(error).message);
            }
        });

        return azureAccount;
    }

    public static getInstance(): AzureUtilityManager {
        if (!AzureUtilityManager._instance) { // lazy initialization
            AzureUtilityManager._instance = new AzureUtilityManager();
        }
        return AzureUtilityManager._instance;
    }

    public async tryGetAzureAccount(): Promise<AzureAccount | undefined> {
        if (!this._azureAccountPromise) {
            this._azureAccountPromise = this.loadAzureAccountExtension();
        }

        return await this._azureAccountPromise;
    }

    public async requireAzureAccount(): Promise<AzureAccount | undefined> {
        let azureAccount = await this.tryGetAzureAccount();
        if (azureAccount) {
            return azureAccount;
        } else {
            const open: vscode.MessageItem = { title: "View in Marketplace" };
            const msg = 'This functionality requires installing the Azure Account extension.';
            let response = await vscode.window.showErrorMessage(msg, open);
            if (response === open) {
                await openExternal('https://marketplace.visualstudio.com/items?itemName=ms-vscode.azure-account');
            }

            throw new UserCancelledError(msg);
        }
    }

    public async getSession(subscription: SubscriptionModels.Subscription): Promise<AzureSession> {
        const tenantId: string = getTenantId(subscription);
        const azureAccount: AzureAccount = await this.requireAzureAccount();
        let foundSession = azureAccount.sessions.find((s) => s.tenantId.toLowerCase() === tenantId.toLowerCase());
        if (!foundSession) {
            throw new Error(`Could not find a session with tenantId "${tenantId}"`);
        }

        return foundSession;
    }

    public async getFilteredSubscriptionList(): Promise<SubscriptionModels.Subscription[]> {
        return (await this.requireAzureAccount()).filters.map<SubscriptionModels.Subscription>(filter => {
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

    public async getContainerRegistryManagementClient(subscription: SubscriptionModels.Subscription): Promise<ContainerRegistryManagementClient> {
        let client = new ContainerRegistryManagementClient(await this.getCredentialByTenantId(subscription), getSubscriptionId(subscription));
        addExtensionUserAgent(client);
        return client;
    }

    public async getResourceManagementClient(subscription: SubscriptionModels.Subscription): Promise<ResourceManagementClient> {
        return new ResourceManagementClient(await this.getCredentialByTenantId(getTenantId(subscription)), getSubscriptionId(subscription));
    }

    public async getRegistries(
        subscription?: Subscription, resourceGroup?: string,
        compareFn: (a: ContainerModels.Registry, b: ContainerModels.Registry) => number = this.sortRegistriesAlphabetically
    ): Promise<ContainerModels.Registry[]> {

        let registries: ContainerModels.Registry[] = [];

        if (subscription && resourceGroup) {
            //Get all registries under one resourcegroup
            const client = await this.getContainerRegistryManagementClient(subscription);
            registries = await client.registries.listByResourceGroup(resourceGroup);

        } else if (subscription) {
            //Get all registries under one subscription
            const client = await this.getContainerRegistryManagementClient(subscription);
            registries = await client.registries.list();

        } else {
            //Get all registries for all subscriptions
            const subs: SubscriptionModels.Subscription[] = await this.getFilteredSubscriptionList();
            const subPool = new AsyncPool(MAX_CONCURRENT_SUBSCRIPTON_REQUESTS);

            for (let sub of subs) {
                subPool.addTask(async () => {
                    const client = await this.getContainerRegistryManagementClient(sub);
                    let subscriptionRegistries: ContainerModels.Registry[] = await client.registries.list();
                    registries = registries.concat(subscriptionRegistries);
                });
            }
            await subPool.runAll();
        }

        registries.sort(compareFn);

        //Return only non classic registries
        return registries.filter((registry) => { return !registry.sku.tier || !registry.sku.tier.includes('Classic') });
    }

    private sortRegistriesAlphabetically(a: ContainerModels.Registry, b: ContainerModels.Registry): number {
        return (a.loginServer || '').localeCompare(b.loginServer || '');
    }

    public async getResourceGroups(subscription?: SubscriptionModels.Subscription): Promise<ResourceGroup[]> {
        if (subscription) {
            const resourceClient = await this.getResourceManagementClient(subscription);
            return await resourceClient.resourceGroups.list();
        }
        const subs = await this.getFilteredSubscriptionList();
        const subPool = new AsyncPool(MAX_CONCURRENT_SUBSCRIPTON_REQUESTS);
        let resourceGroups: ResourceGroup[] = [];
        //Acquire each subscription's data simultaneously

        for (let sub of subs) {
            subPool.addTask(async () => {
                const resourceClient = await this.getResourceManagementClient(sub);
                const internalGroups = await resourceClient.resourceGroups.list();
                resourceGroups = resourceGroups.concat(internalGroups);
            });
        }
        await subPool.runAll();
        return resourceGroups;
    }

    public async getCredentialByTenantId(tenantIdOrSubscription: string | Subscription): Promise<ServiceClientCredentials> {
        let tenantId = typeof tenantIdOrSubscription === 'string' ? tenantIdOrSubscription : getTenantId(tenantIdOrSubscription);
        const session = (await this.requireAzureAccount()).sessions.find((azureSession) => azureSession.tenantId.toLowerCase() === tenantId.toLowerCase());

        if (session) {
            return session.credentials;
        }
        throw new Error(`Failed to get credentials, tenant ${tenantId} not found.`);
    }

    public async getLocationsBySubscription(subscription: SubscriptionModels.Subscription): Promise<SubscriptionModels.Location[]> {
        const credential = await this.getCredentialByTenantId(getTenantId(subscription));
        const client = new SubscriptionClient(credential);
        const locations = <SubscriptionModels.Location[]>(await client.subscriptions.listLocations(getSubscriptionId(subscription)));
        return locations;
    }

    //CHECKS
    //Provides a unified check for login that should be called once before using the rest of the singletons capabilities
    public async waitForLogin(): Promise<boolean> {
        let account = await this.tryGetAzureAccount();
        if (!account) {
            return false;
        }
        return await account.waitForLogin();
    }
}
