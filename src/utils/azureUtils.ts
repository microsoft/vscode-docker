/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AuthenticationContext } from 'adal-node';
import { ServiceClientCredentials } from 'ms-rest';
import { TokenResponse } from 'ms-rest-azure';
import * as request from 'request-promise-native';
import { ISubscriptionContext } from 'vscode-azureextensionui';
import { localize } from '../localize';

const refreshTokens: { [key: string]: string } = {};

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
    /* eslint-disable camelcase */
    const options = {
        form: {
            grant_type: 'refresh_token',
            service: registryHost,
            scope,
            refresh_token: undefined
        },
        json: true
    };

    try {
        if (refreshTokens[registryHost]) {
            options.form.refresh_token = refreshTokens[registryHost];
            const responseFromCachedToken = <{ access_token: string }>await request.post(`https://${registryHost}/oauth2/token`, options);
            return responseFromCachedToken.access_token;
        }
    } catch { /* No-op, fall back to a new refresh token */ }

    options.form.refresh_token = refreshTokens[registryHost] = await acquireAcrRefreshToken(registryHost, subContext);
    const response = <{ access_token: string }>await request.post(`https://${registryHost}/oauth2/token`, options);
    return response.access_token;
    /* eslint-enable camelcase */
}

export async function acquireAcrRefreshToken(registryHost: string, subContext: ISubscriptionContext): Promise<string> {
    const aadTokenResponse = await acquireAadTokens(subContext);

    /* eslint-disable-next-line camelcase */
    const response = <{ refresh_token: string }>await request.post(`https://${registryHost}/oauth2/exchange`, {
        form: {
            /* eslint-disable-next-line camelcase */
            grant_type: 'access_token',
            service: registryHost,
            tenant: subContext.tenantId,
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
