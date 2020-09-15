/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Response } from 'request';
import * as request from 'request-promise-native';
import { localize } from '../../../localize';
import { IOAuthContext } from '../../registries/auth/IAuthProvider';
import { getWwwAuthenticateContext } from '../../registries/auth/oAuthUtils';

export interface ImageRegistry {
    registryMatch: RegExp;
    baseUrl: string;
    getToken?(requestOptions: request.RequestPromiseOptions, scope: string): Promise<string>;
}

let dockerHubAuthContext: IOAuthContext | undefined;

export const registries: ImageRegistry[] = [
    {
        registryMatch: /docker[.]io\/library/i,
        baseUrl: 'https://registry-1.docker.io/v2/library',
        getToken: async (requestOptions: request.RequestPromiseOptions, scope: string): Promise<string> => {
            if (!dockerHubAuthContext) {
                try {
                    await request('https://registry-1.docker.io/v2/', requestOptions);
                } catch (err) {
                    const result = getWwwAuthenticateContext(err);

                    if (!result) {
                        throw err;
                    }

                    dockerHubAuthContext = result;
                }
            }

            const authOptions: request.RequestPromiseOptions = {
                ...requestOptions,
                qs: {
                    service: dockerHubAuthContext.service,
                    scope: scope,
                },
            };

            const tokenResponse = await request(dockerHubAuthContext.realm.toString(), authOptions) as Response;
            // eslint-disable-next-line @typescript-eslint/tslint/config
            const token: string = tokenResponse?.body?.token;

            if (!token) {
                throw new Error(localize('vscode-docker.outdatedImageChecker.noToken', 'Failed to acquire Docker Hub OAuth token for scope: \'{0}\'', scope));
            }

            return token;
        }
    },
    {
        registryMatch: /mcr[.]microsoft[.]com/i,
        baseUrl: 'https://mcr.microsoft.com/v2',
    }
];
