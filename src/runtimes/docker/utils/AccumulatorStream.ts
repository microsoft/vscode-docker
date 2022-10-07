/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as stream from 'stream';

// Caller can pass any writable options except 'write' and 'writev'
type AccumulatorOptions = Omit<stream.WritableOptions, 'write' | 'writev'>;

/**
 * Accumulates stream content in memory, which can then be obtained with
 * `getBytes()` or `getString()`. Both are async and will resolve only
 * once the stream has ended.
 */
export class AccumulatorStream extends stream.Writable {
    private readonly chunks: Buffer[] = [];
    private readonly streamEndPromise: Promise<void>;

    /**
     * Creates an {@link AccumulatorStream}
     * @param options Same as {@link stream.WritableOptions}, except `write` or `writev` cannot be supplied.
     */
    public constructor(options?: AccumulatorOptions) {
        super({
            ...options,
            write: (chunk: Buffer, encoding: never, callback: (err?: Error) => void) => {
                this.chunks.push(chunk);
                callback();
            },
        });

        this.streamEndPromise = new Promise<void>((resolve, reject) => {
            this.on('close', () => {
                resolve();
            });

            this.on('error', (err) => {
                reject(err);
            });
        });
    }

    /**
     * Gets the full stream content
     * @returns The full stream content in a {@link Buffer}
     */
    public async getBytes(): Promise<Buffer> {
        await this.streamEndPromise;
        return Buffer.concat(this.chunks);
    }

    /**
     * Gets the full stream content
     * @returns The full stream content in a string
     */
    public async getString(encoding: BufferEncoding = 'utf-8'): Promise<string> {
        const rawString = (await this.getBytes()).toString(encoding);
        // Remove non-printing control characters and trailing newlines
        // eslint-disable-next-line no-control-regex
        return rawString.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F]|\r?\n$/g, '');
    }
}
