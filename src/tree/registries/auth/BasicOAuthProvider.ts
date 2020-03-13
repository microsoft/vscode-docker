/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as request from 'request';
import * as rp from 'request-promise-native';
import * as vscode from 'vscode';
import { ICachedRegistryProvider } from '../ICachedRegistryProvider';
import { getRegistryPassword } from '../registryPasswords';
import { IDockerCliCredentials } from '../RegistryTreeItemBase';
import { IAuthProvider, IOAuthContext } from './IAuthProvider';

/**
 * Performs basic auth and password-grant-type OAuth
 */
class BasicOAuthProvider implements IAuthProvider {

    public async getAuthOptions(cachedProvider: ICachedRegistryProvider, authContext?: IOAuthContext): Promise<request.AuthOptions> {
        if (!authContext) {
            return {
                username: cachedProvider.username,
                password: await getRegistryPassword(cachedProvider),
            };
        }

        /* eslint-disable camelcase */
        const response = <{ access_token: string }>await rp.post(authContext.realm.toString(), {
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

        return {
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
}

export const basicOAuthProvider: IAuthProvider = new BasicOAuthProvider();
