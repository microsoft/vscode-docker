/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Response } from "request";
import { RequestPromiseOptions } from "request-promise-native";
import { URL } from "url";
import { workspace } from "vscode";
import { ext } from "../extensionVariables";

export function getNextLinkFromHeaders(response: Response): string | undefined {
    const linkHeader: string | undefined = response.headers && <string>response.headers.link;
    if (linkHeader) {
        const match = linkHeader.match(/<(.*)>; rel="next"/i);
        return match ? match[1] : undefined;
    } else {
        return undefined;
    }
}

export async function registryRequest<T>(node: ISupportsAuth, method: 'GET' | 'DELETE' | 'POST', url: string, customOptions?: RequestPromiseOptions): Promise<IResponse<T>> {
    let httpSettings = workspace.getConfiguration('http');
    let strictSSL = httpSettings.get<boolean>('proxyStrictSSL', true);
    const options = {
        method,
        json: true,
        resolveWithFullResponse: true,
        strictSSL: strictSSL,
        ...customOptions
    }

    await node.addAuth(options);

    let fullUrl: string = url;
    if (!url.startsWith(node.baseUrl)) {
        let parsed = new URL(url, node.baseUrl);
        fullUrl = parsed.toString();
    }

    return <IResponse<T>>await ext.request(fullUrl, options);
}

interface IResponse<T> extends Response {
    body: T;
}

interface ISupportsAuth {
    addAuth(options: RequestPromiseOptions): Promise<void>;
    baseUrl: string;
}
