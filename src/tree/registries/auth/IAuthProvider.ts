/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Request } from 'node-fetch';
import { URL } from 'url';
import { ICachedRegistryProvider } from '../ICachedRegistryProvider';
import { IDockerCliCredentials } from '../RegistryTreeItemBase';

export interface IAuthProvider {
    signRequest(cachedProvider: ICachedRegistryProvider, request: Request, authContext?: IOAuthContext): Promise<Request>;
    getDockerCliCredentials(cachedProvider: ICachedRegistryProvider, authContext?: IOAuthContext): Promise<IDockerCliCredentials>;
}

export interface IOAuthContext {
    realm: URL,
    service: string,
    scope?: string,
}
