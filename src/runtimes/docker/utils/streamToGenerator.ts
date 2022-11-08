/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export async function* stringStreamToGenerator(
    output: NodeJS.ReadableStream
): AsyncGenerator<string> {
    for await (const chunk of output) {
        if (typeof chunk === 'string') {
            yield chunk;
        } else if (Buffer.isBuffer(chunk)) {
            yield chunk.toString();
        }
    }
}

export async function* byteStreamToGenerator(
    output: NodeJS.ReadableStream
): AsyncGenerator<Buffer> {
    for await (const chunk of output) {
        if (typeof chunk === 'string') {
            yield Buffer.from(chunk);
        } else if (Buffer.isBuffer(chunk)) {
            yield chunk;
        }
    }
}
