/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AuthenticationContext } from 'adal-node';
import * as assert from 'assert';
import { Registry } from "azure-arm-containerregistry/lib/models";
import { SubscriptionModels } from 'azure-arm-resource';
import { Subscription } from "azure-arm-resource/lib/subscription/models";
import { ServiceClientCredentials } from 'ms-rest';
import { TokenResponse } from 'ms-rest-azure';
import { NULL_GUID } from "../../constants";
import { getCatalog, getTags, TagInfo } from "../../explorer/models/commonRegistryUtils";
import { ext } from '../../extensionVariables';
import { AzureSession } from "../../typings/azure-account.api";
import { AzureUtilityManager } from '../azureUtilityManager';
import { getId, getLoginServer } from '../nonNull';
import { AzureImage } from "./models/image";
import { Repository } from "./models/repository";

//General helpers
/** Gets the subscription for a given registry
 * @returns a subscription object
 */
export function getSubscriptionFromRegistry(registry: Registry): SubscriptionModels.Subscription {
    let id = getId(registry);
    let subscriptionId = id.slice('/subscriptions/'.length, id.search('/resourceGroups/'));
    const subs = AzureUtilityManager.getInstance().getFilteredSubscriptionList();
    let subscription = subs.find((sub): boolean => {
        return sub.subscriptionId === subscriptionId;
    });

    if (!subscription) {
        throw new Error(`Could not find subscription with id "${subscriptionId}"`);
    }

    return subscription;
}

export function getResourceGroupName(registry: Registry): string {
    let id = getId(registry);
    return id.slice(id.search('resourceGroups/') + 'resourceGroups/'.length, id.search('/providers/'));
}

//Registry item management
/** List images under a specific Repository */
export async function getImagesByRepository(element: Repository): Promise<AzureImage[]> {
    let allImages: AzureImage[] = [];
    let image: AzureImage;
    const { acrAccessToken } = await acquireACRAccessTokenFromRegistry(element.registry, 'repository:' + element.name + ':pull');
    const tags: TagInfo[] = await getTags('https://' + element.registry.loginServer, element.name, { bearer: acrAccessToken });
    for (let tag of tags) {
        image = new AzureImage(element, tag.tag, tag.created);
        allImages.push(image);
    }
    return allImages;
}

/** List repositories on a given Registry. */
export async function getRepositoriesByRegistry(registry: Registry): Promise<Repository[]> {
    let repo: Repository;
    const { acrAccessToken } = await acquireACRAccessTokenFromRegistry(registry, "registry:catalog:*");
    const repositories: string[] = await getCatalog('https://' + registry.loginServer, { bearer: acrAccessToken });
    let allRepos: Repository[] = [];
    for (let tempRepo of repositories) {
        repo = new Repository(registry, tempRepo);
        allRepos.push(repo);
    }
    //Note these are ordered by default in alphabetical order
    return allRepos;
}

/** Sends a custom html request to a registry
 * @param http_method : the http method, this function currently only uses delete
 * @param login_server: the login server of the registry
 * @param path : the URL path
 * @param username : registry username, can be in generic form of 0's, used to generate authorization header
 * @param password : registry password, can be in form of accessToken, used to generate authorization header
 */
export async function sendRequestToRegistry(http_method: 'delete', login_server: string, path: string, bearerAccessToken: string): Promise<void> {
    let url: string = `https://${login_server}${path}`;
    let header = 'Bearer ' + bearerAccessToken;
    let opt = {
        headers: { 'Authorization': header },
        http_method: http_method,
        url: url
    }

    if (http_method === 'delete') {
        await ext.request.delete(opt);
        return;
    }

    throw new Error('sendRequestToRegistry: Unexpected http method');
}

//Credential management
/** Obtains registry username and password compatible with docker login */
export async function loginCredentials(registry: Registry): Promise<{ password: string, username: string }> {
    const subscription: Subscription = getSubscriptionFromRegistry(registry);
    const session: AzureSession = AzureUtilityManager.getInstance().getSession(subscription)
    const { aadAccessToken, aadRefreshToken } = await acquireAADTokens(session);
    const acrRefreshToken = await acquireACRRefreshToken(getLoginServer(registry), session.tenantId, aadRefreshToken, aadAccessToken);
    return { 'password': acrRefreshToken, 'username': NULL_GUID };
}

/** Obtains tokens for using the Docker Registry v2 Api
 * @param registry The targeted Azure Container Registry
 * @param scope String determining the scope of the access token
 * @returns acrRefreshToken: For use as a Password for docker registry access , acrAccessToken: For use with docker API
 */
export async function acquireACRAccessTokenFromRegistry(registry: Registry, scope: string): Promise<{ acrRefreshToken: string, acrAccessToken: string }> {
    const subscription: Subscription = getSubscriptionFromRegistry(registry);
    const session: AzureSession = AzureUtilityManager.getInstance().getSession(subscription);
    const { aadAccessToken, aadRefreshToken } = await acquireAADTokens(session);
    let loginServer = getLoginServer(registry);
    const acrRefreshToken = await acquireACRRefreshToken(loginServer, session.tenantId, aadRefreshToken, aadAccessToken);
    const acrAccessToken = await acquireACRAccessToken(loginServer, scope, acrRefreshToken)
    return { acrRefreshToken, acrAccessToken };
}

/** Obtains refresh and access tokens for Azure Active Directory. */
export async function acquireAADTokens(session: AzureSession): Promise<{ aadAccessToken: string, aadRefreshToken?: string }> {
    return new Promise<{ aadAccessToken: string, aadRefreshToken?: string }>((resolve, reject) => {
        const credentials = <{ context: AuthenticationContext, username: string, clientId: string } & ServiceClientCredentials>session.credentials;
        const environment = session.environment;
        credentials.context.acquireToken(
            environment.activeDirectoryResourceId,
            credentials.username,
            credentials.clientId,
            (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    let tokenResponse = <TokenResponse>result;
                    resolve({
                        aadAccessToken: tokenResponse.accessToken,
                        aadRefreshToken: tokenResponse.refreshToken,
                    });
                }
            });
    });
}

/** Obtains refresh tokens for Azure Container Registry. */
export async function acquireACRRefreshToken(registryUrl: string, tenantId: string, aadRefreshToken: string | undefined, aadAccessToken: string): Promise<string> {
    const acrRefreshTokenResponse = <{ refresh_token: string }>await ext.request.post(`https://${registryUrl}/oauth2/exchange`, {
        form: {
            grant_type: "refresh_token",
            service: registryUrl,
            tenant: tenantId,
            refresh_token: aadRefreshToken,
            access_token: aadAccessToken,
        },
        json: true
    });

    return acrRefreshTokenResponse.refresh_token;
}

/** Gets an ACR accessToken by using an acrRefreshToken */
export async function acquireACRAccessToken(registryUrl: string, scope: string, acrRefreshToken: string): Promise<string> {
    const acrAccessTokenResponse = <{ access_token: string }>await ext.request.post(`https://${registryUrl}/oauth2/token`, {
        form: {
            grant_type: "refresh_token",
            service: registryUrl,
            scope,
            refresh_token: acrRefreshToken,
        },
        json: true
    });
    return acrAccessTokenResponse.access_token;
}
