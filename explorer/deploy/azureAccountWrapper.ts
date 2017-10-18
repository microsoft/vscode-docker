/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ExtensionContext, Extension, extensions, Disposable } from 'vscode';
import { ServiceClientCredentials } from 'ms-rest';
import { AzureEnvironment } from 'ms-rest-azure';
import { SubscriptionClient, SubscriptionModels } from 'azure-arm-resource';
import { AzureAccount, AzureSession, AzureLoginStatus } from '../../typings/azure-account.api';

import * as util from './util';

export class NotSignedInError extends Error { }

export class CredentialError extends Error { }

export class AzureAccountWrapper {
    readonly accountApi: AzureAccount;

    constructor(readonly extensionConext: ExtensionContext, azureAccount: AzureAccount) {
        this.accountApi = azureAccount;
    }

    getAzureSessions(): AzureSession[] {
        const status = this.signInStatus;
        if (status !== 'LoggedIn') {
            throw new NotSignedInError(status)
        }
        return this.accountApi.sessions;
    }

    getCredentialByTenantId(tenantId: string): ServiceClientCredentials {
        const session = this.getAzureSessions().find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());

        if (session) {
            return session.credentials;
        }

        throw new CredentialError(`Failed to get credential, tenant ${tenantId} not found.`);
    }

    get signInStatus(): AzureLoginStatus {
        return this.accountApi.status;
    }

    getFilteredSubscriptions(): SubscriptionModels.Subscription[] {
        return this.accountApi.filters.map<SubscriptionModels.Subscription>(filter => {
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

    async getAllSubscriptions(): Promise<SubscriptionModels.Subscription[]> {
        const tasks = new Array<Promise<SubscriptionModels.Subscription[]>>();

        this.getAzureSessions().forEach((s, i, array) => {
            const client = new SubscriptionClient(s.credentials);
            const tenantId = s.tenantId;
            tasks.push(util.listAll(client.subscriptions, client.subscriptions.list()).then(result => {
                return result.map<SubscriptionModels.Subscription>((value) => {
                    // The list() API doesn't include tenantId information in the subscription object, 
                    // however many places that uses subscription objects will be needing it, so we just create 
                    // a copy of the subscription object with the tenantId value.
                    return {
                        id: value.id,
                        subscriptionId: value.subscriptionId,
                        tenantId: tenantId,
                        displayName: value.displayName,
                        state: value.state,
                        subscriptionPolicies: value.subscriptionPolicies,
                        authorizationSource: value.authorizationSource
                    };
                });
            }));
        });

        const results = await Promise.all(tasks);
        const subscriptions = new Array<SubscriptionModels.Subscription>();

        results.forEach((result) => result.forEach((subscription) => subscriptions.push(subscription)));
        return subscriptions;
    }

    async getLocationsBySubscription(subscription: SubscriptionModels.Subscription): Promise<SubscriptionModels.Location[]> {
        const credential = this.getCredentialByTenantId(subscription.tenantId);
        const client = new SubscriptionClient(credential);
        const locations = <SubscriptionModels.Location[]>(await client.subscriptions.listLocations(subscription.subscriptionId));
        return locations;
    }

    registerSessionsChangedListener(listener: (e: void) => any, thisArg: any): Disposable {
        return this.accountApi.onSessionsChanged(listener, thisArg, this.extensionConext.subscriptions);
    }

    registerFiltersChangedListener(listener: (e: void) => any, thisArg: any): Disposable {
        return this.accountApi.onFiltersChanged(listener, thisArg, this.extensionConext.subscriptions);
    }
}
