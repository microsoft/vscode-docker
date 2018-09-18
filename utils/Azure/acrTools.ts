/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import ContainerRegistryManagementClient from 'azure-arm-containerregistry';
import { Registry, Run, RunGetLogResult } from "azure-arm-containerregistry/lib/models";
import { SubscriptionModels } from 'azure-arm-resource';
import { ResourceGroup } from "azure-arm-resource/lib/resource/models";
import { Subscription } from "azure-arm-resource/lib/subscription/models";
import { BlobService, createBlobServiceWithSas } from "azure-storage";
import * as vscode from "vscode";
import { NULL_GUID } from "../../constants";
import { getCatalog, getTags, TagInfo } from "../../explorer/models/commonRegistryUtils";
import { ext } from '../../extensionVariables';
import { AzureSession } from "../../typings/azure-account.api";
import { AzureUtilityManager } from '../azureUtilityManager';
import { AzureImage } from "./models/image";
import { Repository } from "./models/repository";

//General helpers
/**
 * @param registry gets the subscription for a given registry
 * @returns a subscription object
 */
export function getSubscriptionFromRegistry(registry: Registry): SubscriptionModels.Subscription {
    let subscriptionId = registry.id.slice('/subscriptions/'.length, registry.id.search('/resourceGroups/'));
    const subs = AzureUtilityManager.getInstance().getFilteredSubscriptionList();
    let subscription = subs.find((sub): boolean => {
        return sub.subscriptionId === subscriptionId;
    });
    return subscription;
}

export function getResourceGroupName(registry: Registry): any {
    return registry.id.slice(registry.id.search('resourceGroups/') + 'resourceGroups/'.length, registry.id.search('/providers/'));
}

//Gets resource group object from registry and subscription
export async function getResourceGroup(registry: Registry, subscription: Subscription): Promise<ResourceGroup> { ///to do: move to acr tools
    let resourceGroups: ResourceGroup[] = await AzureUtilityManager.getInstance().getResourceGroups(subscription);
    const resourceGroupName = getResourceGroupName(registry);
    return resourceGroups.find((res) => { return res.name === resourceGroupName });
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

/** Sends a custon html request to a registry
 * @param http_method : the http method, this function currently only uses delete
 * @param login_server: the login server of the registry
 * @param path : the URL path
 * @param username : registry username, can be in generic form of 0's, used to generate authorization header
 * @param password : registry password, can be in form of accessToken, used to generate authorization header
 */
export async function sendRequestToRegistry(http_method: string, login_server: string, path: string, bearerAccessToken: string): Promise<any> {
    let url: string = `https://${login_server}${path}`;
    let header = 'Bearer ' + bearerAccessToken;
    let opt = {
        headers: { 'Authorization': header },
        http_method: http_method,
        url: url
    }

    if (http_method === 'delete') {
        return await ext.request.delete(opt);
    }

    assert(false, 'sendRequestToRegistry: Unexpected http method');
}

//Credential management
/** Obtains registry username and password compatible with docker login */
export async function getLoginCredentials(registry: Registry): Promise<{ password: string, username: string }> {
    const subscription: Subscription = getSubscriptionFromRegistry(registry);
    const session: AzureSession = AzureUtilityManager.getInstance().getSession(subscription)
    const { aadAccessToken, aadRefreshToken } = await acquireAADTokens(session);
    const acrRefreshToken = await acquireACRRefreshToken(registry.loginServer, session.tenantId, aadRefreshToken, aadAccessToken);
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
    const acrRefreshToken = await acquireACRRefreshToken(registry.loginServer, session.tenantId, aadRefreshToken, aadAccessToken);
    const acrAccessToken = await acquireACRAccessToken(registry.loginServer, scope, acrRefreshToken)
    return { acrRefreshToken, acrAccessToken };
}

/** Obtains refresh and access tokens for Azure Active Directory. */
export async function acquireAADTokens(session: AzureSession): Promise<{ aadAccessToken: string, aadRefreshToken: string }> {
    return new Promise<{ aadAccessToken: string, aadRefreshToken: string }>((resolve, reject) => {
        const credentials: any = session.credentials;
        const environment: any = session.environment;
        credentials.context.acquireToken(environment.activeDirectoryResourceId, credentials.username, credentials.clientId, (err: any, result: any) => {
            if (err) {
                reject(err);
            } else {
                resolve({
                    aadAccessToken: result.accessToken,
                    aadRefreshToken: result.refreshToken,
                });
            }
        });
    });
}

/** Obtains refresh tokens for Azure Container Registry. */
export async function acquireACRRefreshToken(registryUrl: string, tenantId: string, aadRefreshToken: string, aadAccessToken: string): Promise<string> {
    const acrRefreshTokenResponse: { refresh_token: string } = await ext.request.post(`https://${registryUrl}/oauth2/exchange`, {
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
    const acrAccessTokenResponse: { access_token: string } = await ext.request.post(`https://${registryUrl}/oauth2/token`, {
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

/** Parses information into a readable format from a blob url */
export function getBlobInfo(blobUrl: string): { accountName: string, endpointSuffix: string, containerName: string, blobName: string, sasToken: string, host: string } {
    let items: string[] = blobUrl.slice(blobUrl.search('https://') + 'https://'.length).split('/');
    let accountName: string = blobUrl.slice(blobUrl.search('https://') + 'https://'.length, blobUrl.search('.blob'));
    let endpointSuffix: string = items[0].slice(items[0].search('.blob.') + '.blob.'.length);
    let containerName: string = items[1];
    let blobName: string = items[2] + '/' + items[3] + '/' + items[4].slice(0, items[4].search('[?]'));
    let sasToken: string = items[4].slice(items[4].search('[?]') + 1);
    let host: string = accountName + '.blob.' + endpointSuffix;
    return { accountName, endpointSuffix, containerName, blobName, sasToken, host };
}

/** Stream logs from a blob into output channel.
 * Note, since output streams don't actually deal with streams directly, text is not actually
 * streamed in which prevents updating of already appended lines. Usure if this can be fixed. Nonetheless
 * logs do load in chunks every 1 second.
 */
export async function streamLogs(registry: Registry, run: Run, outputChannel: vscode.OutputChannel, providedClient?: ContainerRegistryManagementClient): Promise<void> {
    //Prefer passed in client to avoid initialization but if not added obtains own
    let client = providedClient ? providedClient : AzureUtilityManager.getInstance().getContainerRegistryManagementClient(getSubscriptionFromRegistry(registry));
    let temp: RunGetLogResult = await client.runs.getLogSasUrl(getResourceGroupName(registry), registry.name, run.runId);
    const link = temp.logLink;
    let blobInfo = getBlobInfo(link);
    let blob: BlobService = createBlobServiceWithSas(blobInfo.host, blobInfo.sasToken);
    let available = 0;
    let start = 0;

    let obtainLogs = setInterval(async () => {
        let props: BlobService.BlobResult;
        let metadata: { [key: string]: string; };
        try {
            props = await getBlobProperties(blobInfo, blob);
            metadata = props.metadata;
        } catch (error) {
            //Not found happens when the properties havent yet been set, blob is not ready. Wait 1 second and try again
            if (error.code === "NotFound") { return; } else { throw error; }
        }
        available = +props.contentLength;
        let text: string;
        //Makes sure that if item fails it does so due to network/azure errors not lack of new content
        if (available > start) {
            text = await getBlobToText(blobInfo, blob, start);
            let utf8encoded = (new Buffer(text, 'ascii')).toString('utf8');
            start += text.length;
            outputChannel.append(utf8encoded);
        }
        if (metadata.Complete) {
            clearInterval(obtainLogs);
        }
    }, 1000);
}

// Promisify getBlobToText for readability and error handling purposes
async function getBlobToText(blobInfo: any, blob: BlobService, rangeStart: number): Promise<string> {
    return new Promise<any>((resolve, reject) => {
        blob.getBlobToText(blobInfo.containerName, blobInfo.blobName, { rangeStart: rangeStart },
            (error, result) => {
                if (error) { reject() } else { resolve(result); }
            });
    });
}

// Promisify getBlobProperties for readability and error handling purposes
async function getBlobProperties(blobInfo: any, blob: BlobService): Promise<BlobService.BlobResult> {
    return new Promise<any>((resolve, reject) => {
        blob.getBlobProperties(blobInfo.containerName, blobInfo.blobName, (error, result) => {
            if (error) { reject(error) } else { resolve(result); }
        });
    });
}
