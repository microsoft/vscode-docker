/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SubscriptionModels } from 'azure-arm-resource';
import WebSiteManagementClient = require('azure-arm-website');
import * as WebSiteModels from 'azure-arm-website/lib/models';
import { ServiceClientCredentials } from 'ms-rest';
import * as vscode from 'vscode';
import { AzureAccountWrapper } from './azureAccountWrapper';

export interface PartialList<T> extends Array<T> {
    nextLink?: string;
}

export async function listAll<T>(client: { listNext(nextPageLink: string): Promise<PartialList<T>>; }, first: Promise<PartialList<T>>): Promise<T[]> {
    const all: T[] = [];

    for (let list = await first; list.length || list.nextLink; list = list.nextLink ? await client.listNext(list.nextLink) : []) {
        all.push(...list);
    }

    return all;
}

// tslint:disable-next-line:promise-function-async // Grandfathered in
export function waitForWebSiteState(webSiteManagementClient: WebSiteManagementClient, site: WebSiteModels.Site, state: string, intervalMs: number = 5000, timeoutMs: number = 60000): Promise<void> {
    // tslint:disable-next-line:promise-must-complete // false positive
    return new Promise((resolve, reject) => {
        const func = async (count: number) => {
            const currentSite = await webSiteManagementClient.webApps.get(site.resourceGroup, site.name);
            if (currentSite.state.toLowerCase() === state.toLowerCase()) {
                resolve();
            } else {
                count += intervalMs;

                if (count < timeoutMs) {
                    // tslint:disable-next-line:no-string-based-set-timeout // false positive
                    setTimeout(func, intervalMs, count);
                } else {
                    reject(new Error(`Timeout waiting for Web Site "${site.name}" state "${state}".`));
                }
            }
        };

        // tslint:disable-next-line:no-string-based-set-timeout // false positive
        setTimeout(func, intervalMs, intervalMs);
    });
}

export function getSignInCommandString(): string {
    return 'azure-account.login';
}

// tslint:disable-next-line:promise-function-async // Grandfathered in
export function getWebAppPublishCredential(azureAccount: AzureAccountWrapper, subscription: SubscriptionModels.Subscription, site: WebSiteModels.Site): Promise<WebSiteModels.User> {
    const credentials = azureAccount.getCredentialByTenantId(subscription.tenantId);
    const websiteClient = new WebSiteManagementClient(credentials, subscription.subscriptionId);
    return websiteClient.webApps.listPublishingCredentials(site.resourceGroup, site.name);
}

// Output channel for the extension
const outputChannel = vscode.window.createOutputChannel("Azure App Service");

export function getOutputChannel(): vscode.OutputChannel {
    return outputChannel;
}
