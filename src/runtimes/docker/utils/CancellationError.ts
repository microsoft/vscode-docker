/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationTokenLike } from '../typings/CancellationTokenLike';

export class CancellationError extends Error {
    constructor(message: string, public readonly token?: CancellationTokenLike) {
        super(message);
        this.name = this.constructor.name;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isCancellationError(err: any): err is CancellationError {
    return err?.name === CancellationError.name;
}
