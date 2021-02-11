/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { default as fetch, Request } from 'node-fetch';
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
        headers: {
            grant_type: 'refresh_token',
            service: registryHost,
            scope: scope,
            refresh_token: undefined
        },
        method: 'POST',
    };

    try {
        if (refreshTokens[registryHost]) {
            options.headers.refresh_token = refreshTokens[registryHost];
            const responseFromCachedToken = <{ access_token: string }>await (await fetch(`https://${registryHost}/oauth2/token`, options)).json();
            return responseFromCachedToken.access_token;
        }
    } catch { /* No-op, fall back to a new refresh token */ }

    options.headers.refresh_token = refreshTokens[registryHost] = await acquireAcrRefreshToken(registryHost, subContext);
    const response = <{ access_token: string }>await (await fetch(`https://${registryHost}/oauth2/token`, options)).json();
    return response.access_token;
    /* eslint-enable camelcase */
}

export async function acquireAcrRefreshToken(registryHost: string, subContext: ISubscriptionContext): Promise<string> {
    // const aadTokenResponse = await subContext.credentials.getToken();

    const options = {
        method: 'POST',
        headers: {
            /* eslint-disable-next-line camelcase */
            grant_type: 'access_token',
            service: registryHost,
            tenant: subContext.tenantId,
        },
    };

    let request = new Request(`https://${registryHost}/oauth2/exchange`, options);

    request = await subContext.credentials.signRequest(request) as Request;

    /* eslint-disable-next-line camelcase */
    const response = <{ refresh_token: string }>await (await fetch(request)).json();

    return response.refresh_token;
}
