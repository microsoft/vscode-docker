/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export class ChildProcessError extends Error {
    constructor(message: string, public readonly code: number | null, public readonly signal: NodeJS.Signals | null) {
        super(message);
        this.name = this.constructor.name;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isChildProcessError(err: any): err is ChildProcessError {
    return err?.name === ChildProcessError.name;
}
