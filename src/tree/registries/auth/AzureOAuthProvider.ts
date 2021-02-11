/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Request } from 'node-fetch';
import { ISubscriptionContext } from 'vscode-azureextensionui';
import { acquireAcrAccessToken, acquireAcrRefreshToken } from '../../../utils/azureUtils';
import { bearerAuthHeader } from '../../../utils/httpRequest';
import { ICachedRegistryProvider } from '../ICachedRegistryProvider';
import { IDockerCliCredentials } from '../RegistryTreeItemBase';
import { IAuthProvider, IOAuthContext } from './IAuthProvider';

export interface IAzureOAuthContext extends IOAuthContext {
    subscriptionContext: ISubscriptionContext
}

class AzureOAuthProvider implements IAuthProvider {

    public async signRequest(cachedProvider: ICachedRegistryProvider, request: Request, authContext: IAzureOAuthContext): Promise<Request> {
        request.headers.set('Authorization', bearerAuthHeader(await acquireAcrAccessToken(authContext.realm.host, authContext.subscriptionContext, authContext.scope)));
        return request;
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
