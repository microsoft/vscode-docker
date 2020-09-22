/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { Suite } from 'mocha';
import { nonNullProp } from '../extension.bundle';

suite("(unit) nonNull", async function (this: Suite): Promise<void> {
    type TestSubscription = {
        stringOrUndefined?: string;
        arrayOrUndefined?: number[];
        stringOrNull: string | null;
        string: string;
    }

    function testNonNull<T>(testName: string, actual: T, expected: T) {
        test(testName, () => {
            assert.equal(actual, expected);
        });
    }

    function testNonNullThrows<T>(testName: string, block: () => any) {
        test(testName, () => {
            assert.throws(block, 'Expected an exception');
        });
    }

    test('nonNullProp', () => {
        testNonNull('string-or-undefined: string', nonNullProp(<TestSubscription>{ stringOrUndefined: 'hi' }, 'stringOrUndefined'), 'hi');
        testNonNullThrows('string-or-undefined property: undefined', () => nonNullProp(<TestSubscription>{ stringOrUndefined: undefined }, 'stringOrUndefined'));
        testNonNullThrows('string-or-undefined : missing', () => nonNullProp(<TestSubscription>{}, 'stringOrUndefined'));

        testNonNull('string-or-null property: string', nonNullProp(<TestSubscription>{ stringOrNull: 'hi' }, 'stringOrNull'), 'hi');
        testNonNullThrows('string-or-null property: null', () => nonNullProp(<TestSubscription>{ stringOrNull: null }, 'stringOrNull'));
        testNonNullThrows('string-or-null property: missing', () => nonNullProp(<TestSubscription>{}, 'stringOrNull'));

        testNonNull('string property: null missing', nonNullProp(<TestSubscription>{ string: 'hi' }, 'string'), 'hi');
        testNonNull('string property: empty', nonNullProp(<TestSubscription>{ string: '' }, 'string'), '');

        testNonNull('array-of-undefined property: array', nonNullProp(<TestSubscription>{ arrayOrUndefined: [1, 2] }, 'arrayOrUndefined'), [1, 2]);
        testNonNullThrows('array-of-undefined property: missing', () => nonNullProp(<TestSubscription>{}, 'arrayOrUndefined'));
    });
});
