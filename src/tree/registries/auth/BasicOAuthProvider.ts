/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { default as fetch, Request } from 'node-fetch';
import { localize } from '../../../localize';
import { basicAuthHeader, bearerAuthHeader } from '../../../utils/httpRequest';
import { ICachedRegistryProvider } from '../ICachedRegistryProvider';
import { getRegistryPassword } from '../registryPasswords';
import { IDockerCliCredentials } from '../RegistryTreeItemBase';
import { IAuthProvider, IOAuthContext } from './IAuthProvider';

/**
 * Performs basic auth and password-grant-type OAuth
 */
class BasicOAuthProvider implements IAuthProvider {

    public async signRequest(cachedProvider: ICachedRegistryProvider, request: Request, authContext?: IOAuthContext): Promise<Request> {
        if (!authContext) {
            request.headers.set('Authorization', basicAuthHeader(cachedProvider.username, await getRegistryPassword(cachedProvider)));
            return request;
        }

        const tokenRequest = new Request(authContext.realm.toString(), {
            method: 'POST',
            headers: {
                Authorization: basicAuthHeader(cachedProvider.username, await getRegistryPassword(cachedProvider)),
                'grant_type': 'password',
                'service': authContext.service,
                'scope': authContext.scope
            },
        });

        const tokenResponse = await fetch(tokenRequest);

        if (tokenResponse.status >= 200 && tokenResponse.status < 300) {
            const body = await tokenResponse.json();
            // eslint-disable-next-line @typescript-eslint/tslint/config
            request.headers.set('Authorization', bearerAuthHeader(body.token));
            return request;
        } else {
            throw new Error(localize('vscode-docker.registries.auth.basic.failedToAcquireToken', 'Failed to acquire OAuth token from {0}. Status: {1}', authContext.realm.toString(), tokenResponse.status));
        }
    }

    public async getDockerCliCredentials(cachedProvider: ICachedRegistryProvider, authContext?: IOAuthContext): Promise<IDockerCliCredentials> {
        const creds: IDockerCliCredentials = {
            registryPath: cachedProvider.url
        };

        if (cachedProvider.username) {
            creds.auth = {
                username: cachedProvider.username,
                password: await getRegistryPassword(cachedProvider),
            };
        }

        return creds;
    }
}

export const basicOAuthProvider: IAuthProvider = new BasicOAuthProvider();
