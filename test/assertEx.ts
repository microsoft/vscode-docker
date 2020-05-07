/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { parseError } from 'vscode-azureextensionui';
import * as fse from 'fs-extra';

// Provides additional assertion-style functions for use in tests.

/**
 * Asserts that two arrays are equal (non-deep), even if in different orders
 */
export function unorderedArraysEqual<T>(actual: T[], expected: T[], message?: string): void {
    let result = areUnorderedArraysEqual(actual, expected);
    assert(result.areEqual, `${message || "Unordered arrays are not equal"}\n${result.message}`);
}

/**
 * Asserts that two arrays are not equal (non-deep), even if they were ordered the same way
 */
export function notUnorderedArraysEqual<T>(actual: T[], expected: T[], message?: string): void {
    let result = areUnorderedArraysEqual(actual, expected);
    assert(!result.areEqual, `${message || "Unordered arrays are equal but were expected not to be"}\n${result.message}`);
}

/**
 * Same as assert.throws except for async functions
 * @param block Block to test
 * @param expected Properties in this object will be tested to ensure they exist in the object that is thrown
 * @param message Optional failure message
 */
export async function throwsOrRejectsAsync(block: () => Promise<any>, expected: {}, message?: string): Promise<void> {
    let error: any;
    try {
        await block();
    } catch (err) {
        error = err;
    }

    if (!error) {
        throw new Error(`Expected exception or rejection: ${parseError(expected).message}`);
    }
    for (let prop of Object.getOwnPropertyNames(expected)) {
        assert.equal(error[prop], expected[prop], `Error did not have the expected value for property '${prop}'`);
    }
}

function areUnorderedArraysEqual<T>(actual: T[], expected: T[]): { areEqual: boolean, message?: string } {
    actual = actual.slice();
    expected = expected.slice();
    actual.sort();
    expected.sort();

    let message = `Actual:   ${JSON.stringify(actual)}\nExpected: ${JSON.stringify(expected)}`

    if (!(actual.length === expected.length)) {
        return { areEqual: false, message };
    }

    for (let i = 0; i < actual.length; ++i) {
        if (actual[i] !== expected[i]) {
            return { areEqual: false, message };
        }
    }

    return { areEqual: true };
}

export function assertContains(s: string, searchString: string): void {
    assert(s.includes(searchString), `Expected to find '${searchString}' in '${s}'`);
}

export function assertNotContains(s: string, searchString: string): void {
    assert(!s.includes(searchString), `Unexpected text '${searchString}' found in '${s}'`);
}

export function assertFileContains(filePath: string, text: string): void {
    let contents = fse.readFileSync(filePath).toString();
    assert(contents.indexOf(text) >= 0, `Expected to find '${text}' in file ${filePath}, but found:\n${contents}`);
}

export function assertNotFileContains(filePath: string, text: string): void {
    let contents = fse.readFileSync(filePath).toString();
    assert(contents.indexOf(text) < 0, `Unexpected text '${text}' found in file ${filePath}`);
}

export function assertSameDate(a: number, b: number): void {
    const dateA = new Date(a);
    const dateB = new Date(b);

    assert(dateA.getFullYear() === dateB.getFullYear());
    assert(dateA.getMonth() === dateB.getMonth());
    assert(dateA.getDate() === dateB.getDate());
}
