/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import { default as fetch, Request, RequestInit, Response } from 'node-fetch';
import { localize } from '../localize';
// import url = require('url');
import { addUserAgent } from './addUserAgent';

export async function httpsRequest(opts: RequestInit): Promise<string> {
    // let convertedOpts = convertToOptions(opts);
    // addUserAgent(convertedOpts);

    // return new Promise<string>((resolve, reject) => {
    //     let req = https.request(convertedOpts, (res) => {
    //         let data = '';
    //         res.on('data', (d: string) => {
    //             data += d;
    //         })
    //         res.on('end', () => {
    //             resolve(data);
    //         })
    //     });
    //     req.end();
    //     req.on('error', reject);
    // });
    return '';
}

export class HttpResponse2<T> {
    public constructor(private readonly innerResponse: Response) { }

    public async json(): Promise<T> {
        return await this.innerResponse.json() as T;
    }

    public get headers(): { [key: string]: string | string[] } {
        return this.innerResponse.headers.raw();
    }
}

export function basicAuthHeader(username: string, password: string): string {
    const buffer = Buffer.from(`${username}:${password}`);
    return `Basic: ${buffer.toString('base64')}`;
}

export function bearerAuthHeader(token: string): string {
    return `Bearer: ${token}`;
}

export async function httpRequest2<T>(url: string, options?: RequestInit, signRequest?: (request: Request) => Promise<Request>): Promise<HttpResponse2<T>> {
    let request = new Request(url, options ?? {});

    if (signRequest) {
        request = await signRequest(request);
    }

    const response = await fetch(request);

    if (response.status >= 200 && response.status < 300) {
        return new HttpResponse2(response);
    } else {
        // TODO: this error loses our info
        throw new Error(localize('vscode-docker.utils.httpRequest', 'Failed request to {0}, with status code {1}: {2}', url, response.status, response.statusText));
    }
}

export async function streamToFile(downloadUrl: string, fileName: string): Promise<void> {
    // return new Promise<void>((resolve, reject) => {
    //     try {
    //         // Prepare write stream to write to a file.
    //         const writeStream = fse.createWriteStream(fileName);
    //         writeStream.on('close', () => {
    //             resolve();
    //         });

    //         writeStream.on('error', error => {
    //             writeStream.close();
    //             reject(error);
    //         })

    //         // Pipe the request to the writestream
    //         const req = request
    //             .get(downloadUrl)
    //             .on('error', reject);
    //         req.pipe(writeStream);

    //     } catch (err) {
    //         reject(err);
    //     }
    // });
    return Promise.resolve();
}
