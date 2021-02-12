/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import { default as fetch, Request, RequestInit, Response } from 'node-fetch';
import { URL, URLSearchParams } from 'url';
import { localize } from '../localize';

export async function httpRequest<T>(url: string, options?: RequestOptionsLike, signRequest?: (request: RequestLike) => Promise<RequestLike>): Promise<HttpResponse<T>> {
    const requestOptions: RequestInit = options;
    if (options.form) {
        // URLSearchParams is a silly way to say "it's form data"
        requestOptions.body = new URLSearchParams(options.form);
    }

    let request = new Request(url, options ?? {});

    if (signRequest) {
        request = await signRequest(request) as Request;
    }

    const response = await fetch(request);

    if (response.status >= 200 && response.status < 300) {
        return new HttpResponse(response);
    } else {
        throw new HttpErrorResponse(response);
    }
}

export class HttpResponse<T> {
    private bodyPromise: Promise<T> | undefined;
    private normalizedHeaders: { [key: string]: string } | undefined;

    public constructor(private readonly innerResponse: Response) { }

    public async json(): Promise<T> {
        if (!this.bodyPromise) {
            // This allows multiple calls to `json()` without eating up the stream
            this.bodyPromise = this.innerResponse.json();
        }

        return this.bodyPromise;
    }

    public get headers(): { [key: string]: string } {
        if (!this.normalizedHeaders) {
            this.normalizedHeaders = {};
            for (const key of this.innerResponse.headers.keys()) {
                this.normalizedHeaders[key] = this.innerResponse.headers.get(key);
            }
        }

        return this.normalizedHeaders;
    }
}

export class HttpErrorResponse extends Error {
    public constructor(public readonly response: ResponseLike) {
        super(localize('vscode-docker.utils.httpRequest', 'Request to {0} failed with status {1}: {2}', response.url, response.status, response.statusText));
    }

    // This method lets parseError from vscode-azureextensionui get the HTTP status code as the error code
    public get code(): number {
        return this.response.status;
    }
}

type RequestMethod = 'HEAD' | 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';

export interface RequestOptionsLike {
    headers?: { [key: string]: string };
    method?: RequestMethod; // This is an enum type because it enforces the above valid options on callers (which do not directly use node-fetch's Request object)
    form?: { [key: string]: string };
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

const realmRegExp = /realm=\"([^"]+)\"/i;
const serviceRegExp = /service=\"([^"]+)\"/i;
const scopeRegExp = /scope=\"([^"]+)\"/i;

export function getWwwAuthenticateContext(error: HttpErrorResponse): IOAuthContext | undefined {
    if (error.response?.status === 401) {
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
        }
    }

    return undefined;
}
