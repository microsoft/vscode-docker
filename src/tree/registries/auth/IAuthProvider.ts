/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IOAuthContext, RequestLike } from '../../../utils/httpRequest';
import { ICachedRegistryProvider } from '../ICachedRegistryProvider';
import { IDockerCliCredentials } from '../RegistryTreeItemBase';

export interface IAuthProvider {
    signRequest(cachedProvider: ICachedRegistryProvider, request: RequestLike, authContext?: IOAuthContext): Promise<RequestLike>;
    getDockerCliCredentials(cachedProvider: ICachedRegistryProvider, authContext?: IOAuthContext): Promise<IDockerCliCredentials>;
}
