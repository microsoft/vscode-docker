/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as request from 'request-promise-native';
import { URL } from 'url';
import { ICachedRegistryProvider } from '../ICachedRegistryProvider';
import { IDockerCliCredentials } from '../RegistryTreeItemBase';

export interface IAuthProvider {
    addAuth(cachedProvider: ICachedRegistryProvider, options: request.RequestPromiseOptions, authContext?: IOAuthContext): Promise<void>;
    getDockerCliCredentials(cachedProvider: ICachedRegistryProvider, authContext?: IOAuthContext): Promise<IDockerCliCredentials>;
}

export interface IOAuthContext {
    realm: URL,
    service: string,
    scope?: string,
}
