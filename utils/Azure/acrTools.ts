import { Registry } from "azure-arm-containerregistry/lib/models";
import { SubscriptionModels } from 'azure-arm-resource';
import request = require('request-promise');
import * as vscode from "vscode";
import { NULL_GUID } from "../../constants";
import { AzureImageNode, AzureRepositoryNode } from '../../explorer/models/AzureRegistryNodes';
import { ServiceClientCredentials } from "../../node_modules/ms-rest";
import { AzureAccount, AzureSession } from "../../typings/azure-account.api";
import { AzureImage } from "../Azure/models/image";
import { Repository } from "../Azure/models/Repository";
import { AzureUtilityManager } from '../azureUtilityManager';

/**
 * Developers can use this to visualize and list repositories on a given Registry. This is not a command, just a developer tool.
 * @param registry : the registry whose repositories you want to see
 * @returns allRepos : an array of Repository objects that exist within the given registry
 */
export async function getAzureRepositories(registry: Registry): Promise<Repository[]> {
    const allRepos: Repository[] = [];
    let repo: Repository;
    let azureAccount: AzureAccount = AzureUtilityManager.getInstance().getAccount();
    if (!azureAccount) {
        return [];
    }
    const { accessToken, refreshToken } = await getRegistryTokens(registry);
    if (accessToken && refreshToken) {

        await request.get('https://' + registry.loginServer + '/v2/_catalog', {
            auth: {
                bearer: accessToken
            }
        }, (err, httpResponse, body) => {
            if (body.length > 0) {
                const repositories = JSON.parse(body).repositories;
                for (let tempRepo of repositories) {
                    repo = new Repository(registry, tempRepo, accessToken, refreshToken);
                    allRepos.push(repo);
                }
            }
        });
    }
    //Note these are ordered by default in alphabetical order
    return allRepos;
}

/**
 * @param registry gets the registry
 * @returns a string, the resource group name
 */
export function getResourceGroupName(registry: Registry): any {
    return registry.id.slice(registry.id.search('resourceGroups/') + 'resourceGroups/'.length, registry.id.search('/providers/'));
}

/**
 * @param registry : the registry to get credentials for
 * @returns : the updated refresh and access tokens which can be used to generate a header for an API call
 */
export async function getRegistryTokens(registry: Registry): Promise<{ refreshToken: any, accessToken: any }> {
    const subscription = getRegistrySubscription(registry);
    const tenantId: string = subscription.tenantId;
    let azureAccount: AzureAccount = AzureUtilityManager.getInstance().getAccount();

    const session: AzureSession = azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());
    const { accessToken } = await acquireAADToken(session);

    //regenerates in case they have expired
    if (accessToken) {
        let refreshTokenACR;
        let accessTokenACR;

        await request.post('https://' + registry.loginServer + '/oauth2/exchange', {
            form: {
                grant_type: 'access_token',
                service: registry.loginServer,
                tenant: tenantId,
                access_token: accessToken
            }
        }, (err, httpResponse, body) => {
            if (body.length > 0) {
                refreshTokenACR = JSON.parse(body).refresh_token;
            } else {
                return;
            }
        });

        await request.post('https://' + registry.loginServer + '/oauth2/token', {
            form: {
                grant_type: 'refresh_token',
                service: registry.loginServer,
                scope: 'registry:catalog:*',
                refresh_token: refreshTokenACR
            }
        }, (err, httpResponse, body) => {
            if (body.length > 0) {
                accessTokenACR = JSON.parse(body).access_token;
            } else {
                return;
            }
        });
        if (refreshTokenACR && accessTokenACR) {
            return { 'refreshToken': refreshTokenACR, 'accessToken': accessTokenACR };
        }
    }
    vscode.window.showErrorMessage('Could not generate tokens');
}
//Obtains refresh and access tokens for an Azure Active Directory enabled registry.
export async function acquireAadToken(session: AzureSession): Promise<{ aadAccessToken: string, aadRefreshToken: string }> {
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

/** Function used to create header for http request to acr */
export function getAuthorizationHeader(username: string, password: string): string {
    let auth;
    if (username === '00000000-0000-0000-0000-000000000000') {
        auth = 'Bearer ' + password;
    } else {
        auth = ('Basic ' + (encode(username + ':' + password).trim()));
    }
    return auth;
}

/**
 * First encodes to base 64, and then to latin1. See online documentation to see typescript encoding capabilities
 * see https://nodejs.org/api/buffer.html#buffer_buf_tostring_encoding_start_end for details {Buffers and Character Encodings}
 * current character encodings include: ascii, utf8, utf16le, ucs2, base64, latin1, binary, hex. Version v6.4.0
 * @param str : the string to encode for api URL purposes
 */
export function encode(str: string): string {
    let bufferB64 = new Buffer(str);
    let bufferLat1 = new Buffer(bufferB64.toString('base64'));
    return bufferLat1.toString('latin1');
}

/**
 * Lots of https requests but they must be separate from getTokens because the forms are different
 * @param element the repository where the desired images are
 * @returns a list of AzureImage objects from the given repository (see azureUtils.ts)
 */
export async function getAzureImages(element: Repository): Promise<AzureImage[]> {
    let allImages: AzureImage[] = [];
    let image: AzureImage;
    let tags;
    let azureAccount: AzureAccount = AzureUtilityManager.getInstance().getAccount();
    let tenantId: string = element.subscription.tenantId;
    let refreshTokenACR;
    let accessTokenACR;
    const session: AzureSession = azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());
    const { accessToken } = await acquireAADToken(session);
    if (accessToken) {
        await request.post('https://' + element.registry.loginServer + '/oauth2/exchange', {
            form: {
                grant_type: 'access_token',
                service: element.registry.loginServer,
                tenant: tenantId,
                access_token: accessToken
            }
        }, (err, httpResponse, body) => {
            if (body.length > 0) {
                refreshTokenACR = JSON.parse(body).refresh_token;
            } else {
                return [];
            }
        });

        await request.post('https://' + element.registry.loginServer + '/oauth2/token', {
            form: {
                grant_type: 'refresh_token',
                service: element.registry.loginServer,
                scope: 'repository:' + element.name + ':pull',
                refresh_token: refreshTokenACR
            }
        }, (err, httpResponse, body) => {
            if (body.length > 0) {
                accessTokenACR = JSON.parse(body).access_token;
            } else {
                return [];
            }
        });

        await request.get('https://' + element.registry.loginServer + '/v2/' + element.name + '/tags/list', {
            auth: {
                bearer: accessTokenACR
            }
        }, (err, httpResponse, body) => {
            if (err) { return []; }

            if (body.length > 0) {
                tags = JSON.parse(body).tags;
            }
        });

        for (let tag of tags) {
            image = new AzureImage(element, tag);
            allImages.push(image);
        }
    }
    return allImages;
}

/** Acquires login credentials for a registry in the form of refresh tokens and NULL_GUID
 * @param subscription : the subscription the registry is on
 * @param registry : the registry to get login credentials for
 * @param context : if command is invoked through a right click on an AzureRepositoryNode. This context has a password and username
 */
export async function loginCredentials(registry: Registry): Promise<{ password: string, username: string }> {
    //grab the access token to be used as a password, and a generic username
    let creds = await getRegistryTokens(registry);
    return { password: creds.refreshToken, username: NULL_GUID };
}

/**
 * @param http_method : the http method, this function currently only uses delete
 * @param login_server: the login server of the registry
 * @param path : the URL path
 * @param username : registry username, can be in generic form of 0's, used to generate authorization header
 * @param password : registry password, can be in form of accessToken, used to generate authorization header
 */
export async function sendRequestToRegistry(http_method: string, login_server: string, path: string, username: string, password: string): Promise<any> {
    let url: string = `https://${login_server}${path}`;
    let header = getAuthorizationHeader(username, password);
    let opt = {
        headers: { 'Authorization': header },
        http_method: http_method,
        url: url
    }
    if (http_method === 'delete') {
        return await request.delete(opt);
    }
}

/**
 * @param registry gets the subscription for a given registry
 * @returns a subscription object
 */
export function getRegistrySubscription(registry: Registry): SubscriptionModels.Subscription {
    let subscriptionId = registry.id.slice('/subscriptions/'.length, registry.id.search('/resourceGroups/'));
    const subs = AzureUtilityManager.getInstance().getFilteredSubscriptionList();
    let subscription = subs.find((sub): boolean => {
        return sub.subscriptionId === subscriptionId;
    });
    return subscription;
}

/*
Calls to Azure Resource Manager to resolve the login server for the specified registry.
Obtains refresh credentials from the profile in use. For a headless call, this will give you the registered SPN, for a regular user this will give you a refresh token.
Makes an HTTPS GET call to the registry server's /v2 endpoint, without credentials. A bearer token authentication challenge is expected, specifying realm and service values. The realm contains the authentication server's URL.
Makes an HTTPS POST call to the authentication server's POST /oauth2/exchange endpoint, with a body indicating the grant type, the service, the tenant, and the credentials.
From the server's response, we extract an Azure Container Registry refresh token.
Pass the refresh token as the password to the Docker CLI, using a null GUID as the username and calling docker login. From here on, the docker CLI takes care of the authorization cycle using oauth2.
*/

export async function getSessionCredentials(subscription: SubscriptionModels.Subscription, registry: Registry): Promise<{ password: string, username: string }> {
    const tenantId: string = subscription.tenantId;
    const session: AzureSession = AzureUtilityManager.getInstance().getAccount().sessions.find((s) => s.tenantId.toLowerCase() === tenantId.toLowerCase());
    const { accessToken, refreshToken } = await acquireAADToken(session);

    if (accessToken && refreshToken) {
        let refreshTokenARC: string;
        //Call POST /oauth2/exchange presenting the AAD refresh token and the AAD access token. The service will return you an ACR refresh token.
        await request.post('https://' + registry.loginServer + '/oauth2/exchange', {
            form: {
                grant_type: 'access_token_refresh_token',
                service: registry.loginServer,
                tenant: tenantId,
                refresh_token: refreshToken,
                access_token: accessToken
            }
        }, (err, httpResponse, body) => {
            if (body.length > 0) {
                refreshTokenARC = JSON.parse(body).refresh_token;
            }
        });
        const nullGUID: string = "00000000-0000-0000-0000-000000000000"
        return { 'username': nullGUID, 'password': refreshTokenARC }
    }
}

//Access Token - To call the ACR API's
//RefreshToken - To do docker Login
