/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as request from 'request';
import { ISubscriptionContext } from 'vscode-azureextensionui';
import { acquireAcrAccessToken, acquireAcrRefreshToken } from '../../../utils/azureUtils';
import { ICachedRegistryProvider } from '../ICachedRegistryProvider';
import { IDockerCliCredentials } from '../RegistryTreeItemBase';
import { IAuthProvider, IOAuthContext } from './IAuthProvider';

export interface IAzureOAuthContext extends IOAuthContext {
    subscriptionContext: ISubscriptionContext
}

class AzureOAuthProvider implements IAuthProvider {

    public async getAuthOptions(cachedProvider: ICachedRegistryProvider, authContext: IAzureOAuthContext): Promise<request.AuthOptions> {
        return {
            bearer: await acquireAcrAccessToken(authContext.realm.host, authContext.subscriptionContext, authContext.scope),
        };
    }

    public async getDockerCliCredentials(cachedProvider: ICachedRegistryProvider, authContext?: IAzureOAuthContext): Promise<IDockerCliCredentials> {
        return {
            registryPath: `https://${authContext.service}`,
            auth: {
                token: await acquireAcrRefreshToken(authContext.realm.host, authContext.subscriptionContext),
            },
        };
    }
}

export const azureOAuthProvider: IAuthProvider = new AzureOAuthProvider();
