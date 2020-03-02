/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AuthenticationContext } from 'adal-node';
import { ContainerRegistryManagementModels as AcrModels } from "azure-arm-containerregistry";
import { BlobService, createBlobServiceWithSas } from "azure-storage";
import { ServiceClientCredentials } from 'ms-rest';
import { TokenResponse } from 'ms-rest-azure';
import * as request from 'request-promise-native';
import { ISubscriptionContext, parseError } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { AzureRegistryTreeItem } from '../tree/registries/azure/AzureRegistryTreeItem';

function parseResourceId(id: string): RegExpMatchArray {
    const matches: RegExpMatchArray | null = id.match(/\/subscriptions\/(.*)\/resourceGroups\/(.*)\/providers\/(.*)\/(.*)/i);
    if (matches === null || matches.length < 3) {
        throw new Error(localize('vscode-docker.utils.azure.invalidResourceId', 'Invalid Azure Resource Id'));
    }
    return matches;
}

export function getResourceGroupFromId(id: string): string {
    return parseResourceId(id)[2];
}

export async function acquireAcrAccessToken(registryHost: string, subContext: ISubscriptionContext, scope: string): Promise<string> {
    const acrRefreshToken = await acquireAcrRefreshToken(registryHost, subContext);

    /* eslint-disable-next-line camelcase */
    const response = <{ access_token: string }>await request.post(`https://${registryHost}/oauth2/token`, {
        form: {
            /* eslint-disable-next-line camelcase */
            grant_type: "refresh_token",
            service: registryHost,
            scope,
            /* eslint-disable-next-line camelcase */
            refresh_token: acrRefreshToken,
        },
        json: true
    });

    return response.access_token;
}

export async function acquireAcrRefreshToken(registryHost: string, subContext: ISubscriptionContext): Promise<string> {
    const aadTokenResponse = await acquireAadTokens(subContext);

    /* eslint-disable-next-line camelcase */
    const response = <{ refresh_token: string }>await request.post(`https://${registryHost}/oauth2/exchange`, {
        form: {
            /* eslint-disable-next-line camelcase */
            grant_type: "refresh_token",
            service: registryHost,
            tenant: subContext.tenantId,
            /* eslint-disable-next-line camelcase */
            refresh_token: aadTokenResponse.refreshToken,
            /* eslint-disable-next-line camelcase */
            access_token: aadTokenResponse.accessToken,
        },
        json: true
    });

    return response.refresh_token;
}

async function acquireAadTokens(subContext: ISubscriptionContext): Promise<TokenResponse> {
    const credentials = <{ context: AuthenticationContext, username: string, clientId: string } & ServiceClientCredentials>subContext.credentials;
    return new Promise<TokenResponse>((resolve, reject) => {
        credentials.context.acquireToken(
            subContext.environment.activeDirectoryResourceId,
            credentials.username,
            credentials.clientId,
            (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(<TokenResponse>result);
                }
            }
        );
    });
}

export interface IBlobInfo {
    accountName: string;
    endpointSuffix: string;
    containerName: string;
    blobName: string;
    sasToken: string;
    host: string;
}

/** Parses information into a readable format from a blob url */
export function getBlobInfo(blobUrl: string): IBlobInfo {
    let items: string[] = blobUrl.slice(blobUrl.search('https://') + 'https://'.length).split('/');
    const accountName = blobUrl.slice(blobUrl.search('https://') + 'https://'.length, blobUrl.search('.blob'));
    const endpointSuffix = items[0].slice(items[0].search('.blob.') + '.blob.'.length);
    const containerName = items[1];
    const blobName = items[2] + '/' + items[3] + '/' + items[4].slice(0, items[4].search('[?]'));
    const sasToken = items[4].slice(items[4].search('[?]') + 1);
    const host = accountName + '.blob.' + endpointSuffix;
    return {
        accountName: accountName,
        endpointSuffix: endpointSuffix,
        containerName: containerName,
        blobName: blobName,
        sasToken: sasToken,
        host: host
    };
}

/** Stream logs from a blob into output channel.
 * Note, since output streams don't actually deal with streams directly, text is not actually
 * streamed in which prevents updating of already appended lines. Usure if this can be fixed. Nonetheless
 * logs do load in chunks every 1 second.
 */
export async function streamLogs(node: AzureRegistryTreeItem, run: AcrModels.Run): Promise<void> {
    let temp: AcrModels.RunGetLogResult = await node.client.runs.getLogSasUrl(node.resourceGroup, node.registryName, run.runId);
    const link = temp.logLink;
    let blobInfo: IBlobInfo = getBlobInfo(link);
    let blob: BlobService = createBlobServiceWithSas(blobInfo.host, blobInfo.sasToken);
    let available = 0;
    let start = 0;

    let obtainLogs = setInterval(
        async () => {
            let props: BlobService.BlobResult;
            let metadata: { [key: string]: string; };
            try {
                props = await getBlobProperties(blobInfo, blob);
                metadata = props.metadata;
            } catch (err) {
                const error = parseError(err);
                // Not found happens when the properties havent yet been set, blob is not ready. Wait 1 second and try again
                if (error.errorType === "NotFound") { return; } else { throw error; }
            }
            available = +props.contentLength;
            let text: string;
            // Makes sure that if item fails it does so due to network/azure errors not lack of new content
            if (available > start) {
                text = await getBlobToText(blobInfo, blob, start);
                let utf8encoded = (new Buffer(text, 'ascii')).toString('utf8');
                start += text.length;
                ext.outputChannel.append(utf8encoded);
            }
            if (metadata.Complete) {
                clearInterval(obtainLogs);
            }
        },
        1000
    );
}

// Promisify getBlobToText for readability and error handling purposes
export async function getBlobToText(blobInfo: IBlobInfo, blob: BlobService, rangeStart: number): Promise<string> {
    return new Promise<string>(
        (resolve, reject) => {
            blob.getBlobToText(
                blobInfo.containerName,
                blobInfo.blobName,
                { rangeStart: rangeStart },
                (error, result) => {
                    if (error) { reject(error) } else { resolve(result); }
                });
        });
}

// Promisify getBlobProperties for readability and error handling purposes
async function getBlobProperties(blobInfo: IBlobInfo, blob: BlobService): Promise<BlobService.BlobResult> {
    return new Promise<BlobService.BlobResult>((resolve, reject) => {
        blob.getBlobProperties(blobInfo.containerName, blobInfo.blobName, (error, result) => {
            if (error) { reject(error) } else { resolve(result); }
        });
    });
}
