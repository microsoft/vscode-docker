/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { default as fetch, Headers, Request } from 'node-fetch';
import { URL } from "url";
import { ociClientId } from "../constants";
import { localize } from '../localize';

export function getNextLinkFromHeaders(response: IResponse<unknown>): string | undefined {
    const linkHeader: string | undefined = response.headers?.get('link');
    if (linkHeader) {
        const match = linkHeader.match(/<(.*)>; rel="next"/i);
        return match ? match[1] : undefined;
    } else {
        return undefined;
    }
}

export async function registryRequest<T>(node: IRegistryAuthTreeItem | IRepositoryAuthTreeItem, method: 'GET' | 'DELETE' | 'POST', url: string, customOptions?: RequestInit): Promise<IResponse<T>> {
    const options = {
        method: method,
        headers: {
            'X-Meta-Source-Client': ociClientId,
        },
        ...customOptions,
    };

    const baseUrl = node.baseUrl || (<IRepositoryAuthTreeItem>node).parent.baseUrl;
    let fullUrl: string = url;
    if (!url.startsWith(baseUrl)) {
        let parsed = new URL(url, baseUrl);
        fullUrl = parsed.toString();
    }

    let request = new Request(fullUrl, options);

    if (node.signRequest) {
        request = await node.signRequest(request);
    } else {
        request = await (<IRepositoryAuthTreeItem>node).parent.signRequest(request);
    }

    const response = await fetch(request);

    if (response.status >= 200 && response.status < 300) {
        return {
            body: await response.json() as T,
            headers: response.headers,
        }
    } else {
        throw new Error(localize('vscode-docker.utils.registry.failedRequest', 'Failed to perform registry request to {0}, with status {1}', fullUrl, response.status));
    }
}

interface IResponse<T> {
    body: T,
    headers: Headers,
}

export interface IRegistryAuthTreeItem {
    signRequest(request: Request): Promise<Request>;
    baseUrl: string;
}

export interface IRepositoryAuthTreeItem extends Partial<IRegistryAuthTreeItem> {
    parent: IRegistryAuthTreeItem;
}
