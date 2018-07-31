import * as assert from 'assert';
import { parseError } from 'vscode-azureextensionui';
import * as fse from 'fs-extra';
import * as path from 'path';

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
    assert(s.includes(searchString), `Expected to find '${searchString}' in ${s}`);
}

export function assertNotContains(s: string, searchString: string): void {
    assert(!s.includes(searchString), `Unexpected text '${searchString}' found in ${s}`);
}

function fileContains(filePath: string, text: string): boolean {
    let contents = fse.readFileSync(filePath).toString();
    return contents.indexOf(text) >= 0;
}

export function assertFileContains(filePath: string, text: string): void {
    assert(fileContains(filePath, text), `Expected to find '${text}' in file ${filePath}`);
}

export function assertNotFileContains(filePath: string, text: string): void {
    assert(!fileContains(filePath, text), `Unexpected text '${text}' found in file ${filePath}`);
}

