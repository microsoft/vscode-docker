/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RequestOptions } from 'https';
import * as moment from 'moment';
import { Response } from 'request';
import * as vscode from 'vscode';
import { parseError } from 'vscode-azureextensionui';
import { MAX_CONCURRENT_REQUESTS, PAGE_SIZE } from '../../constants'
import { ext } from '../../extensionVariables';
import { extractRegExGroups } from '../../helpers/extractRegExGroups';
import { AsyncPool } from '../../utils/asyncpool';
import { nonNullProp, nonNullValue } from '../../utils/nonNull';
import { Manifest, ManifestHistoryV1Compatibility } from '../utils/dockerHubUtils';

interface RegistryNonsensitiveInfo {
    url: string,
}

export interface RegistryCredentials {
    bearer?: string;
    userName?: string;
    password?: string;
}

export interface RegistryInfo extends RegistryNonsensitiveInfo {
    credentials: RegistryCredentials;
}

export interface TagInfo {
    repositoryName: string;
    tag: string;
    created: Date;
}

export async function registryRequest<T>(
    registryUrl: string,
    relativeUrl: string,
    credentials: RegistryCredentials
): Promise<T> {
    let url = `${registryUrl}/${relativeUrl}`;
    try {
        return await coreRegistryRequest<T>(url, credentials);
    } catch (errResponse) {
        let error = errResponse.error;
        let statusCode = errResponse.statusCode;
        let response: Response = (errResponse && errResponse.response) || {};
        let wwwAuthenticate = response.headers["www-authenticate"];

        if (statusCode === 401 && wwwAuthenticate) { // TODO: handle 403
            // Example www-authenticate header: Bearer realm="https://gitlab.com/jwt/auth",service="container_registry"
            let { realm, service, scope } = parseWwwAuthenticateHeader(wwwAuthenticate);
            let token = await requestOAuthToken(realm, service, scope, credentials);
            credentials.bearer = token; // todo

            try {
                return await coreRegistryRequest<T>(url, credentials);
            } catch (errResponse2) {
                let wwwAuthenticate2 = response.headers["www-authenticate"];
                if (errResponse2.statusCode === 401 && wwwAuthenticate2) {
                    // Example www-authenticate header: Bearer realm="https://gitlab.com/jwt/auth",service="container_registry"
                    let { error: error2, scope: scope2 } = parseWwwAuthenticateHeader(wwwAuthenticate);
                    switch (error2) {
                        case 'insufficient_scope':
                            throw new Error(`You don't have sufficient permissions to perform operations with scope "${scope2}"`);
                        default:
                            throw new Error(error2); // asdf
                    }
                    credentials.bearer = token; // todo
                }
            }
        }

        if (error) {
            throw error;
        }

        throw errResponse;
    }
}

async function coreRegistryRequest<T>(
    url: string,
    credentials: RegistryCredentials
): Promise<T> {
    let httpSettings = vscode.workspace.getConfiguration('http');
    let strictSSL = httpSettings.get<boolean>('proxyStrictSSL', true);

    let auth = credentials.bearer ? {
        bearer: credentials.bearer
    } : {
            user: credentials.userName,
            pass: credentials.password
        };

    return await ext.request.get(
        url,
        {
            json: true,
            resolveWithFullResponse: false,
            strictSSL: strictSSL,
            auth: auth
        });
}

async function requestOAuthToken(realm: string, service: string, scope: string, credentials: RegistryCredentials): Promise<string> {
    let url = `${realm}?service=${service || ''}&scope=${scope || ''}`;
    let passwordCredentials = {
        userName: credentials.userName,
        password: credentials.password,
        // String identifying the client. This client_id does not need to be registered with the authorization server but should be set to a meaningful value in order to allow auditing keys created by unregistered clients.
        // (https://docs.docker.com/registry/spec/auth/token/#requesting-a-token)
        clientId: 'vscode-docker'
    };
    let response: {
        token?: string;
        access_token?: string;
        expires_in?: number; // seconds
        issued_at?: string;
        refresh_token?: string; // only if `offline_token=true` set in request

    } = await coreRegistryRequest(url, passwordCredentials);

    return nonNullProp(response, 'token');
}

// TODO: there can be multiple scopes, see https://docs.docker.com/registry/spec/auth/token/#requesting-a-token
function parseWwwAuthenticateHeader(header: string): { realm: string, service: string, scope: string, error: string } {
    // see https://docs.docker.com/registry/spec/auth/token, https://tools.ietf.org/html/rfc2617, https://oauth.net/2/
    // Example www-authenticate headers:
    //   Bearer realm="https://gitlab.com/jwt/auth",service="container_registry"
    //   Bearer realm="https://auth.docker.io/token",service="registry.docker.io",scope="repository:username/my-app:pull,push"
    //   Bearer realm="https://gitlab.com/jwt/auth",service="container_registry",scope="registry:catalog:*",error="insufficient_scope""

    let [scheme, challenge] = extractRegExGroups(header, /^(\w+) (.*$)/, ['', '']);
    scheme = scheme.toLowerCase();
    if (scheme !== 'bearer') {
        throw new Error(`Not authorized (authentication scheme="${scheme}")`)
    }

    let valuePairs = new Map<string, string>();

    let valuePairExpression = `(\\w+)="([^"]*)"`;
    let remainingValuePairs = challenge;
    while (remainingValuePairs) {
        let matches = remainingValuePairs.match(`^${valuePairExpression}(,(.*))?$`);
        if (matches) {
            let key: string;
            let value: string;
            [, key, value, , remainingValuePairs] = matches;
            valuePairs.set(key, value);
        } else {
            throw new Error(`Unrecognized authorization challenge format: ${remainingValuePairs}`);
        }
    }

    return { // asdf
        realm: valuePairs.get('realm'),
        service: valuePairs.get('service'),
        scope: valuePairs.get('scope'),
        error: valuePairs.get('error')
    }
}

export async function getCatalog(registryUrl: string, credentials: RegistryCredentials): Promise<string[]> {
    // Note: Note that the contents of the response are specific to the registry implementation. Some registries may opt to provide a full
    //   catalog output, limit it based on the user’s access level or omit upstream results, if providing mirroring functionality.
    //   (https://docs.docker.com/registry/spec/api/#listing-repositories)
    // Azure and private registries just return the repository names
    let response = await registryRequest<{ repositories: string[] }>(registryUrl, 'v2/_catalog', credentials);
    return response.repositories;
}

export async function getTags(registryUrl: string, repositoryName: string, credentials: RegistryCredentials): Promise<TagInfo[]> {
    let result = await registryRequest<{ tags: string[] }>(registryUrl, `v2/${repositoryName}/tags/list?page_size=${PAGE_SIZE}&page=1`, credentials);
    let tags = result.tags;
    let tagInfos: TagInfo[] = [];

    //Acquires each image's manifest (in parallel) to acquire build time
    const pool = new AsyncPool(MAX_CONCURRENT_REQUESTS);
    for (let tag of tags) {
        pool.addTask(async (): Promise<void> => {
            try {
                let manifest: Manifest = await registryRequest<Manifest>(registryUrl, `v2/${repositoryName}/manifests/${tag}`, credentials);
                let created: Date | undefined;
                if (manifest.history && manifest.history.length) { // TODO: history not available for ECS
                    let history = <ManifestHistoryV1Compatibility>JSON.parse(manifest.history[0].v1Compatibility);
                    created = new Date(history.created);
                }
                let info = <TagInfo>{
                    tag: tag,
                    created
                };
                tagInfos.push(info);
            } catch (error) {
                vscode.window.showErrorMessage(parseError(error).message);
            }
        });
    }

    await pool.runAll();

    tagInfos.sort(compareTagsReverse);
    return tagInfos;
}

function compareTagsReverse(a: TagInfo, b: TagInfo): number {
    if (a.created < b.created) {
        return 1;
    } else if (a.created > b.created) {
        return -1;
    } else {
        return 0;
    }
}

export function formatTag(tag: string, created: Date): string {
    let displayName = `${tag} (${moment(created).fromNow()})`;
    return displayName;
}
