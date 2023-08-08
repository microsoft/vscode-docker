/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureSubscription } from '@microsoft/vscode-azext-azureauth';
import { httpRequest } from '@microsoft/vscode-docker-registries';
import { AuthenticationProvider } from "@microsoft/vscode-docker-registries/";
import * as vscode from 'vscode';

// export interface ACROAuthOptions extends BasicOAuthOptions {
//     readonly subscription: AzureSubscription;
// }

export class ACROAuthProvider implements AuthenticationProvider {
    private refreshTokenCache = new Map<string, string>();

    public constructor(private readonly registryUri: vscode.Uri, private readonly subscription: AzureSubscription) { }

    public async getSession(scopes: string[], options?: vscode.AuthenticationGetSessionOptions): Promise<vscode.AuthenticationSession & { type: string }> {
        const accessToken = await this.getAccessToken(this.subscription);
        const registryString = this.registryUri.toString();

        let refreshToken: string;
        if (!options?.forceNewSession && this.refreshTokenCache.has(registryString)) {
            refreshToken = this.refreshTokenCache.get(registryString)!;
        } else {
            refreshToken = await this.getRefreshTokenFromAccessToken(accessToken, this.registryUri, this.subscription);
            this.refreshTokenCache.set(registryString, refreshToken);
        }

        const oauthToken = await this.getOAuthTokenFromRefreshToken(refreshToken, this.registryUri, scopes.join(' '), this.subscription);
        const { sub, jti } = this.parseToken(oauthToken);

        return {
            id: jti,
            type: 'Bearer',
            accessToken: oauthToken,
            account: {
                label: sub,
                id: sub,
            },
            scopes: scopes,
        };
    }

    private parseToken(accessToken: string): { sub: string, jti: string } {
        const tokenParts = accessToken.split('.');
        const tokenBody = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf8'));
        return {
            sub: tokenBody.sub,
            jti: tokenBody.jti,
        };
    }

    private async getOAuthTokenFromRefreshToken(refreshToken: string, registryUri: vscode.Uri, scopes: string, subscription: AzureSubscription): Promise<string> {
        const requestUrl = registryUri.with({ path: '/oauth2/token' });

        const requestBody = new URLSearchParams({
            /* eslint-disable @typescript-eslint/naming-convention */
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            service: registryUri.authority,
            scope: scopes,
        });

        const response = await httpRequest<{ access_token: string }>(requestUrl.toString(), {
            method: 'POST',
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'content-type': 'application/x-www-form-urlencoded'
            },
            body: requestBody,
        });

        return (await response.json()).access_token;
    }

    private async getRefreshTokenFromAccessToken(accessToken: string, registryUri: vscode.Uri, subscription: AzureSubscription): Promise<string> {
        const requestUrl = registryUri.with({ path: '/oauth2/exchange' });

        const requestBody = new URLSearchParams({
            /* eslint-disable @typescript-eslint/naming-convention */
            grant_type: 'access_token',
            access_token: accessToken,
            service: registryUri.authority,
            tenant: subscription.tenantId,
            /* eslint-enable @typescript-eslint/naming-convention */
        });

        // eslint-disable-next-line @typescript-eslint/naming-convention
        const response = await httpRequest<{ refresh_token: string }>(requestUrl.toString(), {
            method: 'POST',
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'content-type': 'application/x-www-form-urlencoded'
            },
            body: requestBody,
        });

        return (await response.json()).refresh_token;
    }

    private async getAccessToken(subscription: AzureSubscription): Promise<string> {
        // Registry scopes, i.e. those passed to `getSession()`, are not valid for acquiring this
        // access token--instead, those only need to be passed to `getOAuthTokenFromRefreshToken()`
        const token = await subscription.credential.getToken([]);
        return token!.token;
    }
}
