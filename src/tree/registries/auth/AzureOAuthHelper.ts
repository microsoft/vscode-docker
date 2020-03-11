/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as request from 'request-promise-native';
import { ISubscriptionContext } from 'vscode-azureextensionui';
import { acquireAcrAccessToken, acquireAcrRefreshToken } from '../../../utils/azureUtils';
import { ICachedRegistryProvider } from '../ICachedRegistryProvider';
import { IDockerCliCredentials } from '../RegistryTreeItemBase';
import { IAuthHelper, IOAuthContext } from './IAuthHelper';

export interface IAzureOAuthContext extends IOAuthContext {
    subscriptionContext: ISubscriptionContext
}

class AzureOAuthHelper implements IAuthHelper {

    public async addAuth(cachedProvider: ICachedRegistryProvider, options: request.RequestPromiseOptions, authContext: IAzureOAuthContext): Promise<void> {
        options.auth = {
            bearer: await acquireAcrAccessToken(authContext.realm.host, authContext.subscriptionContext, authContext.scope),
        };
    }

    public async getDockerCliCredentials(cachedProvider: ICachedRegistryProvider, authContext?: IAzureOAuthContext): Promise<IDockerCliCredentials> {
        return {
            registryPath: cachedProvider.url,
            auth: {
                token: await acquireAcrRefreshToken(authContext.realm.host, authContext.subscriptionContext),
            },
        };
    }

    public async persistAuth(cachedProvider: ICachedRegistryProvider, secret: string): Promise<void> {
        // Not handled by us
        return Promise.resolve();
    }
}

export const azureOAuthHelper: IAuthHelper = new AzureOAuthHelper();
