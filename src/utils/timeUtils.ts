/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as process from 'process';

const NANOS_TO_MILLIS: bigint = BigInt(1e6);

// Maximum exponent that results in a safe integer
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER
const MAX_SAFE_INTEGER_EXPONENT: number = 53;

export namespace timeUtils {
    export interface ITimedResult<T> {
        Result: T,
        DurationMs: number
    }

    export async function timeIt<T>(doWork: () => Promise<T>): Promise<ITimedResult<T>> {
        const start = process.hrtime.bigint();
        const result = await doWork();
        const stop = process.hrtime.bigint();
        const duration: number = Number(BigInt.asUintN(MAX_SAFE_INTEGER_EXPONENT, ((stop - start) / NANOS_TO_MILLIS)));
        return {
            Result: result,
            DurationMs: duration
        };
    }
}
