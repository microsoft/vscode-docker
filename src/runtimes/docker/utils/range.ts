/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Iterates over numbers from 0 (inclusive) to end (exclusive) stepping by 1
 * @param end The last number (exclusive) to iterate until
 */
export function range(end: number): Generator<number, void, unknown>;
/**
 * Iterates over numbers from start (inclusive) to end (exclusive) stepping by 1
 * @param start The first number (inclusive) to begin iterating from
 * @param stop The last number (exclusive) to iterate until
 */
export function range(start: number, stop: number): Generator<number, void, unknown>;
/**
 * Iterates over numbers from start (inclusive) to end (exclusive) stepping by a specified amount each time
 * @param start The first number (inclusive) to begin iterating from
 * @param stop The last number (exclusive) to iterate until
 * @param step The amount to step by for each subsequent iteration (defaults to 1)
 */
export function range(start: number, stop: number, step: number): Generator<number, void, unknown>;
export function* range(start: number, stop?: number, step: number = 1): Generator<number, void, unknown> {
    if (typeof stop !== 'number') {
        stop = start;
        start = 0;
    }

    if (step === 0) {
        throw new Error('Step must be a positive or negative number.');
    }

    for (let i = start; stop > 0 ? i < stop : i > stop; i += step) {
        yield i;
    }
}
