/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { HttpResponse, IOAuthContext, RequestLike, RequestOptionsLike, basicAuthHeader, bearerAuthHeader, httpRequest } from '../../../utils/httpRequest';
import { ICachedRegistryProvider } from '../ICachedRegistryProvider';
import { getRegistryPassword } from '../registryPasswords';
import { IDockerCliCredentials } from '../RegistryTreeItemBase';
import { IAuthProvider } from './IAuthProvider';

/**
 * Performs basic auth and password-grant-type OAuth
 */
class BasicOAuthProvider implements IAuthProvider {

    public async signRequest(cachedProvider: ICachedRegistryProvider, request: RequestLike, authContext?: IOAuthContext): Promise<RequestLike> {
        if (!authContext) {
            request.headers.set('Authorization', basicAuthHeader(cachedProvider.username, await getRegistryPassword(cachedProvider)));
            return request;
        }

        const options: RequestOptionsLike = {
            form: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'grant_type': 'password',
                'service': authContext.service,
                'scope': authContext.scope
            },
            headers: {
                Authorization: basicAuthHeader(cachedProvider.username, await getRegistryPassword(cachedProvider)),
            },
        };

        let tokenResponse: HttpResponse<{ token: string }>;
        try {
            // First try with POST
            tokenResponse = await httpRequest(authContext.realm.toString(), { method: 'POST', ...options });
        } catch {
            // If that fails, try falling back to GET
            // (If that fails we'll just throw)
            tokenResponse = await httpRequest(authContext.realm.toString(), { method: 'GET', ...options });
        }

        request.headers.set('Authorization', bearerAuthHeader((await tokenResponse.json()).token));
        return request;
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
