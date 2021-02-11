/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Response } from 'node-fetch';
import { URL } from 'url';
import { IOAuthContext } from './IAuthProvider';

const realmRegExp = /realm=\"([^"]+)\"/i;
const serviceRegExp = /service=\"([^"]+)\"/i;
const scopeRegExp = /scope=\"([^"]+)\"/i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/tslint/config
export function getWwwAuthenticateContext(response: Response): IOAuthContext | undefined {
    if (response.status === 401) {
        const wwwAuthHeader: string | undefined = response?.headers?.get('www-authenticate');

        const realmMatch = wwwAuthHeader?.match(realmRegExp);
        const serviceMatch = wwwAuthHeader?.match(serviceRegExp);
        const scopeMatch = wwwAuthHeader?.match(scopeRegExp);

        const realmUrl = new URL(realmMatch?.[1]);

        if (!realmUrl || !serviceMatch?.[1]) {
            return undefined;
        }

        return {
            realm: realmUrl,
            service: serviceMatch[1],
            scope: scopeMatch?.[1],
        }
    }

    return undefined;
}
