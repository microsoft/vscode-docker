/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as https from 'https';
import url = require('url');
import { Uri } from 'vscode';
import { addUserAgent } from './addUserAgent';

function convertToOptions(options: https.RequestOptions | string): https.RequestOptions {
    if (typeof options === 'string') {
        // Must use Node's url, not vscode.Uri
        let optionsAsUrl = url.parse(options);
        return <https.RequestOptions>optionsAsUrl;
    } else {
        return options;
    }
}

// tslint:disable-next-line:promise-function-async // Grandfathered in
export async function httpsRequest(opts: https.RequestOptions | string): Promise<string> {
    let convertedOpts = convertToOptions(opts);
    addUserAgent(convertedOpts);

    return new Promise<string>((resolve, reject) => {
        let req = https.request(convertedOpts, (res) => {
            let data = '';
            res.on('data', (d: string) => {
                data += d;
            })
            res.on('end', () => {
                resolve(data);
            })
        });
        req.end();
        req.on('error', reject);
    });
}

export async function httpsRequestBinary(opts: https.RequestOptions | string): Promise<Buffer> {
    let convertedOpts = convertToOptions(opts);
    addUserAgent(convertedOpts);

    let buffer = Buffer.alloc(0);
    return new Promise<Buffer>((resolve, reject) => {
        let req = https.request(convertedOpts, (res) => {
            res.on('data', (d: Buffer) => {
                buffer = Buffer.concat([buffer, d]);
            });
            res.on('end', () => {
                resolve(buffer);
            })
        });
        req.end();
        req.on('error', reject);
    });
}
