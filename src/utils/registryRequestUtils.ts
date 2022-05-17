/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URL } from "url";
import { ociClientId } from "../constants";
import { ErrorHandling, RequestLike, RequestOptionsLike, ResponseLike, httpRequest } from './httpRequest';

export function getNextLinkFromHeaders(response: IRegistryRequestResponse<unknown>): string | undefined {
    const linkHeader: string | undefined = response.headers.get('link') as string;
    if (linkHeader) {
        const match = linkHeader.match(/<(.*)>; rel="next"/i);
        return match ? match[1] : undefined;
    } else {
        return undefined;
    }
}

export async function registryRequest<T>(
    node: IRegistryAuthTreeItem | IRepositoryAuthTreeItem,
    method: 'GET' | 'DELETE' | 'POST',
    url: string,
    customOptions?: RequestOptionsLike,
    errorHandling: ErrorHandling = ErrorHandling.ThrowOnError
): Promise<IRegistryRequestResponse<T>> {
    const options = {
        method: method,
        headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'X-Meta-Source-Client': ociClientId,
        },
        ...customOptions,
    };

    const baseUrl = node.baseUrl || (<IRepositoryAuthTreeItem>node).parent.baseUrl;
    let fullUrl: string = url;
    if (!url.startsWith(baseUrl)) {
        const parsed = new URL(url, baseUrl);
        fullUrl = parsed.toString();
    }

    const response = await httpRequest<T>(fullUrl, options, async (request) => {
        if (node.signRequest) {
            return node.signRequest(request);
        } else {
            return (<IRepositoryAuthTreeItem>node).parent?.signRequest(request);
        }
    }, errorHandling);

    return {
        body: method !== 'DELETE' ? await response.json() : undefined,
        ...response
    };
}

export interface IRegistryRequestResponse<T> extends ResponseLike {
    body: T
}

export interface IRegistryAuthTreeItem {
    signRequest(request: RequestLike): Promise<RequestLike>;
    baseUrl: string;
}

export interface IRepositoryAuthTreeItem extends Partial<IRegistryAuthTreeItem> {
    parent: IRegistryAuthTreeItem;
}
