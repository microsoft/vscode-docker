/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Request } from 'node-fetch';
import { URLSearchParams } from 'url';
import { IActionContext, IAzureQuickPickItem, ISubscriptionContext } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { httpRequest, RequestOptionsLike } from './httpRequest';

const refreshTokens: { [key: string]: string } = {};

function parseResourceId(id: string): RegExpMatchArray {
    const matches: RegExpMatchArray | null = id.match(/\/subscriptions\/(.*)\/resourceGroups\/(.*)\/providers\/(.*)\/(.*)/i);
    if (matches === null || matches.length < 3) {
        throw new Error(localize('vscode-docker.utils.azure.invalidResourceId', 'Invalid Azure Resource Id'));
    }
    return matches;
}

export function getResourceGroupFromId(id: string): string {
    return parseResourceId(id)[2];
}

/* eslint-disable camelcase */
export async function acquireAcrAccessToken(registryHost: string, subContext: ISubscriptionContext, scope: string): Promise<string> {
    const options: RequestOptionsLike = {
        form: {
            grant_type: 'refresh_token',
            service: registryHost,
            scope: scope,
            refresh_token: undefined
        },
        method: 'POST',
    };

    try {
        if (refreshTokens[registryHost]) {
            options.form.refresh_token = refreshTokens[registryHost];
            const responseFromCachedToken = await httpRequest<{ access_token: string }>(`https://${registryHost}/oauth2/token`, options);
            return (await responseFromCachedToken.json()).access_token;
        }
    } catch { /* No-op, fall back to a new refresh token */ }

    options.form.refresh_token = refreshTokens[registryHost] = await acquireAcrRefreshToken(registryHost, subContext);
    const response = await httpRequest<{ access_token: string }>(`https://${registryHost}/oauth2/token`, options);
    return (await response.json()).access_token;
}

export async function acquireAcrRefreshToken(registryHost: string, subContext: ISubscriptionContext): Promise<string> {
    const options: RequestOptionsLike = {
        method: 'POST',
        form: {
            grant_type: 'access_token',
            service: registryHost,
            tenant: subContext.tenantId,
        },
    };

    const response = await httpRequest<{ refresh_token: string }>(`https://${registryHost}/oauth2/exchange`, options, async (request) => {
        // Obnoxiously, the oauth2/exchange endpoint wants the token in the form data's access_token field, so we need to pick it off the signed auth header and move it there
        await subContext.credentials.signRequest(request);
        const token = (request.headers.get('authorization') as string).replace(/Bearer\s+/i, '');

        const formData = new URLSearchParams({ ...options.form, access_token: token });
        return new Request(request.url, { method: 'POST', body: formData });
    });

    return (await response.json()).refresh_token;
}
/* eslint-enable camelcase */

export async function promptForAciCloud(context: IActionContext): Promise<string> {
    let result: string;
    const wellKnownClouds: IAzureQuickPickItem<string>[] = [
        {
            label: localize('vscode-docker.azureUtils.publicCloud', 'Public'),
            data: 'AzureCloud',
        },
        {
            label: localize('vscode-docker.azureUtils.germanCloud', 'Germany'),
            data: 'AzureGermanCloud',
        },
        {
            label: localize('vscode-docker.azureUtils.chinaCloud', 'China'),
            data: 'AzureChinaCloud',
        },
        {
            label: localize('vscode-docker.azureUtils.usGovtCloud', 'US Government'),
            data: 'AzureUSGovernment',
        },
        {
            label: localize('vscode-docker.azureUtils.otherCloud', 'Other...'),
            data: 'Other',
        },
    ];

    const choice = await ext.ui.showQuickPick(wellKnownClouds, { placeHolder: localize('vscode-docker.azureUtils.chooseCloud', 'Choose a cloud to log in to') });

    if (choice.data === 'Other') {
        // The user wants to enter a different cloud name, so prompt with an input box
        result = await ext.ui.showInputBox({ prompt: localize('vscode-docker.azureUtils.inputCloudName', 'Enter a cloud name') });
    } else {
        result = choice.data;
    }

    context.telemetry.properties.cloudChoice = result;
    return result;
}
