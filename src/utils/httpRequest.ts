/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import { Request, RequestInit, Response, default as fetch } from 'node-fetch';
import { URL, URLSearchParams } from 'url';
import { localize } from '../localize';

export const enum ErrorHandling {
    ThrowOnError,
    ReturnErrorResponse
}

export async function httpRequest<T>(
    url: string,
    options?: RequestOptionsLike,
    signRequest?: (request: RequestLike) => Promise<RequestLike>,
    errorHandling: ErrorHandling = ErrorHandling.ThrowOnError
): Promise<HttpResponse<T>> {
    const requestOptions: RequestInit = options;
    if (options?.form) {
        // URLSearchParams is a silly way to say "it's form data"
        requestOptions.body = new URLSearchParams(options.form);
    }

    let request = new Request(url, requestOptions ?? {});

    if (signRequest) {
        request = await signRequest(request) as Request;
    }

    const response = await fetch(request);

    if (errorHandling === ErrorHandling.ReturnErrorResponse || response.ok) {
        return new HttpResponse(response, url);
    } else {
        throw new HttpErrorResponse(response);
    }
}

export class HttpResponse<T> implements ResponseLike {
    private bodyText: string | undefined;
    private normalizedHeaders: { [key: string]: string } | undefined;
    public readonly headers: HeadersLike;
    public readonly status: number;
    public readonly statusText: string;
    public readonly ok: boolean;

    public constructor(private readonly innerResponse: Response, public readonly url: string) {
        // Unfortunately Typescript will not consider a getter accessor when checking whether a class implements an interface.
        // So we are forced to use readonly members to implement ResponseLike interface.

        this.headers = {
            get: (key: string) => {
                if (!this.normalizedHeaders) {
                    this.normalizedHeaders = {};
                    for (const key of this.innerResponse.headers.keys()) {
                        this.normalizedHeaders[key] = this.innerResponse.headers.get(key);
                    }
                }

                return this.normalizedHeaders[key];
            },
            set: (key: string, value: string) => { this.innerResponse.headers.set(key, value); }
        };

        this.status = this.innerResponse.status;
        this.statusText = this.innerResponse.statusText;
        this.ok = this.innerResponse.ok;
    }

    public async json(): Promise<T> {
        if (this.bodyText === undefined) {
            // This allows multiple calls to `json()` without eating up the stream
            this.bodyText = (await this.innerResponse.text()) ?? '';
        }

        if (this.bodyText.length === 0) {
            return undefined;
        } else {
            return JSON.parse(this.bodyText) as T;
        }
    }
}

export class HttpErrorResponse extends Error {
    public constructor(public readonly response: ResponseLike) {
        super(localize('vscode-docker.utils.httpRequest', 'Request to {0} failed with status {1}: {2}', response.url, response.status, response.statusText));
    }

    // This method lets parseError from @microsoft/vscode-azext-utils get the HTTP status code as the error code
    public get code(): number {
        return this.response.status;
    }
}

type RequestMethod = 'HEAD' | 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';

// Contains only status codes that we handle explicitly in the extension code
export const enum HttpStatusCode {
    Unauthorized = 401,
    NotFound = 404
}

export interface RequestOptionsLike {
    headers?: { [key: string]: string };
    method?: RequestMethod; // This is an enum type because it enforces the above valid options on callers (which do not directly use node-fetch's Request object)
    form?: { [key: string]: string };
    body?: string;
}

export interface RequestLike {
    url: string;
    headers: HeadersLike;
    method: string; // This is a string because node-fetch's Request defines it as such
}

export interface HeadersLike {
    get(header: string): string | string[];
    set(header: string, value: string): void;
}

export interface ResponseLike {
    headers: HeadersLike;
    url: string;
    status: number;
    statusText: string;
    ok: boolean;
}

export async function streamToFile(downloadUrl: string, fileName: string): Promise<void> {
    const response = await fetch(downloadUrl);
    const writeStream = fse.createWriteStream(fileName);
    response.body.pipe(writeStream);

    return new Promise((resolve, reject) => {
        writeStream.on('close', () => {
            resolve();
        });

        writeStream.on('error', error => {
            writeStream.close();
            reject(error);
        });
    });
}

export function basicAuthHeader(username: string, password: string): string {
    const buffer = Buffer.from(`${username}:${password}`);
    return `Basic ${buffer.toString('base64')}`;
}

export function bearerAuthHeader(token: string): string {
    return `Bearer ${token}`;
}

export interface IOAuthContext {
    realm: URL,
    service: string,
    scope?: string,
}

const realmRegExp = /realm="([^"]+)"/i;
const serviceRegExp = /service="([^"]+)"/i;
const scopeRegExp = /scope="([^"]+)"/i;

export function getWwwAuthenticateContext(error: HttpErrorResponse): IOAuthContext | undefined {
    if (error.response?.status === HttpStatusCode.Unauthorized) {
        const wwwAuthHeader: string | undefined = error.response?.headers?.get('www-authenticate') as string;

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
        };
    }

    return undefined;
}
