/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { default as fetch, Request, RequestInit } from 'node-fetch';
import { localize } from '../../../localize';
import { IOAuthContext } from '../../registries/auth/IAuthProvider';
import { getWwwAuthenticateContext } from '../../registries/auth/oAuthUtils';

export interface ImageRegistry {
    registryMatch: RegExp;
    baseUrl: string;
    signRequest?(request: Request): Promise<Request>;
}

let dockerHubAuthContext: IOAuthContext | undefined;

export const registries: ImageRegistry[] = [
    {
        registryMatch: /docker[.]io\/library/i,
        baseUrl: 'https://registry-1.docker.io/v2/library',
        signRequest: async (request: Request): Promise<Request> => {
            if (!dockerHubAuthContext) {
                const response = await fetch('https://registry-1.docker.io/v2/', requestOptions);
                dockerHubAuthContext = getWwwAuthenticateContext(response);
            }

            const authRequestOptions: RequestInit = {
                ...requestOptions,
                headers: {
                    service: dockerHubAuthContext.service,
                    scope: scope,
                },
            };

            const tokenResponse = await fetch(dockerHubAuthContext.realm.toString(), authRequestOptions);

            if (tokenResponse.status >= 200 && tokenResponse.status < 300) {
                // eslint-disable-next-line @typescript-eslint/tslint/config
                return (await tokenResponse.json()).token;
            } else {
                throw new Error(localize('vscode-docker.outdatedImageChecker.noToken', 'Failed to acquire Docker Hub OAuth token for scope: \'{0}\'', scope));
            }
        }
    },
    {
        registryMatch: /mcr[.]microsoft[.]com/i,
        baseUrl: 'https://mcr.microsoft.com/v2',
    }
];
