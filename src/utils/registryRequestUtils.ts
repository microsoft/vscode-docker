/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Response } from "request";
import * as request from 'request-promise-native';
import { URL } from "url";
import { workspace } from "vscode";

export function getNextLinkFromHeaders(response: Response): string | undefined {
    const linkHeader: string | undefined = response.headers && <string>response.headers.link;
    if (linkHeader) {
        const match = linkHeader.match(/<(.*)>; rel="next"/i);
        return match ? match[1] : undefined;
    } else {
        return undefined;
    }
}

export async function registryRequest<T>(node: IRegistryAuthTreeItem | IRepositoryAuthTreeItem, method: 'GET' | 'DELETE' | 'POST', url: string, customOptions?: request.RequestPromiseOptions): Promise<IResponse<T>> {
    let httpSettings = workspace.getConfiguration('http');
    let strictSSL = httpSettings.get<boolean>('proxyStrictSSL', true);
    const options = {
        method,
        json: true,
        resolveWithFullResponse: true,
        strictSSL: strictSSL,
        ...customOptions
    }

    if (node.addAuth) {
        await node.addAuth(options);
    } else {
        await (<IRepositoryAuthTreeItem>node).parent.addAuth(options);
    }

    const baseUrl = node.baseUrl || (<IRepositoryAuthTreeItem>node).parent.baseUrl;
    let fullUrl: string = url;
    if (!url.startsWith(baseUrl)) {
        let parsed = new URL(url, baseUrl);
        fullUrl = parsed.toString();
    }

    return <IResponse<T>>await request(fullUrl, options);
}

interface IResponse<T> extends Response {
    body: T;
}

export interface IRegistryAuthTreeItem {
    addAuth(options: request.RequestPromiseOptions): Promise<void>;
    baseUrl: string;
}

export interface IRepositoryAuthTreeItem extends Partial<IRegistryAuthTreeItem> {
    parent: IRegistryAuthTreeItem;
}
