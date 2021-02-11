/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ociClientId } from '../../../constants';
import { bearerAuthHeader, getWwwAuthenticateContext, HttpError, httpRequest2, IOAuthContext, RequestLike, RequestOptionsLike } from '../../../utils/httpRequest';

export interface ImageRegistry {
    registryMatch: RegExp;
    baseUrl: string;
    signRequest?(request: RequestLike, scope: string): Promise<RequestLike>;
}

let dockerHubAuthContext: IOAuthContext | undefined;

export const registries: ImageRegistry[] = [
    {
        registryMatch: /docker[.]io\/library/i,
        baseUrl: 'https://registry-1.docker.io/v2/library',
        signRequest: async (request: RequestLike, scope: string): Promise<RequestLike> => {
            if (!dockerHubAuthContext) {
                try {
                    const options: RequestOptionsLike = {
                        // TODO: Fix this
                    };

                    await httpRequest2('https://registry-1.docker.io/v2/', options);
                } catch (error) {
                    if (!(error instanceof HttpError) ||
                        !(dockerHubAuthContext = getWwwAuthenticateContext(error))) {
                        // If it's not an HttpError, or getWwwAuthenticateContext came back undefined, rethrow
                        throw error;
                    }
                }
            }

            const authRequestOptions: RequestOptionsLike = {
                headers: {
                    'X-Meta-Source-Client': ociClientId,
                    service: dockerHubAuthContext.service,
                    scope: scope,
                },
            };

            const tokenResponse = await httpRequest2<{ token: string }>(dockerHubAuthContext.realm.toString(), authRequestOptions);
            const token = (await tokenResponse.json()).token;

            request.headers.set('Authorization', bearerAuthHeader(token));
            return request;
        }
    },
    {
        registryMatch: /mcr[.]microsoft[.]com/i,
        baseUrl: 'https://mcr.microsoft.com/v2',
    }
];
