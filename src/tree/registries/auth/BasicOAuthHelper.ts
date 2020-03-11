/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as request from 'request-promise-native';
import * as vscode from 'vscode';
import { ICachedRegistryProvider } from '../ICachedRegistryProvider';
import { getRegistryPassword, setRegistryPassword } from '../registryPasswords';
import { IDockerCliCredentials } from '../RegistryTreeItemBase';
import { IAuthHelper, IOAuthContext } from './IAuthHelper';

/**
 * Performs basic auth and password-grant-type OAuth
 */
class BasicOAuthHelper implements IAuthHelper {

    public async addAuth(cachedProvider: ICachedRegistryProvider, options: request.RequestPromiseOptions, authContext?: IOAuthContext): Promise<void> {
        if (!authContext) {
            options.auth = {
                username: cachedProvider.username,
                password: await getRegistryPassword(cachedProvider),
            };

            return;
        }

        /* eslint-disable camelcase */
        const response = <{ access_token: string }>await request.post(authContext.realm.toString(), {
            form: {
                grant_type: 'password',
                service: authContext.service,
                scope: authContext.scope,
            },
            auth: {
                username: cachedProvider.username,
                password: await getRegistryPassword(cachedProvider),
            },
            strictSSL: vscode.workspace.getConfiguration('http')?.get<boolean>('proxyStrictSSL', true) ?? true,
            json: true,
        });
        /* eslint-enable camelcase */

        options.auth = {
            bearer: response.access_token,
        };
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

    public async persistAuth(cachedProvider: ICachedRegistryProvider, secret: string): Promise<void> {
        await setRegistryPassword(cachedProvider, secret);
    }
}

export const basicOAuthHelper: IAuthHelper = new BasicOAuthHelper();
