/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as request from 'request-promise-native';
import { Uri, workspace } from "vscode";
import { parseError } from "vscode-azureextensionui";
import { ICachedRegistryProvider } from "../ICachedRegistryProvider";
import { getRegistryPassword } from '../registryPasswords';

const realmRegExp = /realm=\"([^"]+)\"/i;
const serviceRegExp = /service=\"([^"]+)\"/i;
const scopeRegExp = /scope=\"([^"]+)\"/i;

export type OAuthContext = {
    realm: Uri,
    service: string,
    scope?: string,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getWwwAuthenticateHeader(error: any): OAuthContext {
    const errorType: string = parseError(error).errorType.toLowerCase();
    if (errorType === "401" || errorType === "unauthorized") {
        // eslint-disable-next-line @typescript-eslint/tslint/config
        const wwwAuthHeader: string | undefined = error?.response?.headers?.['www-authenticate'];

        const realmMatch = wwwAuthHeader?.match(realmRegExp);
        const serviceMatch = wwwAuthHeader?.match(serviceRegExp);
        const scopeMatch = wwwAuthHeader?.match(scopeRegExp);

        let realmUri: Uri | undefined;

        try {
            realmUri = Uri.parse(realmMatch?.[1], true);
        } catch { }

        if (!realmUri || !serviceMatch?.[1]) {
            return undefined;
        }

        return {
            realm: realmUri,
            service: serviceMatch[1],
            scope: scopeMatch?.[1],
        }
    }

    return undefined;
}

export async function addAccessToken(cachedProvider: ICachedRegistryProvider, oAuthContext: OAuthContext, options: request.RequestPromiseOptions): Promise<void> {
    /* eslint-disable camelcase */
    const response = <{ access_token: string }>await request.post(oAuthContext.realm.toString(), {
        form: {
            grant_type: 'password',
            service: oAuthContext.service,
            scope: oAuthContext.scope,
        },
        auth: {
            username: cachedProvider.username,
            password: await getRegistryPassword(cachedProvider)
        },
        strictSSL: workspace.getConfiguration('http')?.get<boolean>('proxyStrictSSL', true) ?? true,
        json: true
    });
    /* eslint-enable camelcase */

    options.auth = {
        bearer: response.access_token
    }
}
