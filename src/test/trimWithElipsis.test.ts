/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { trimWithElipsis } from '../utils/trimWithElipsis';
import * as assert from 'assert';

suite('(unit) trimWithElipsis', () => {
    function genTest(s: string, max: number, expected: string): void {
        test(`${String(s)}: ${max}`, () => {
            const s2 = trimWithElipsis(s, max);
            assert.equal(s2, expected);
        });
    }

    genTest('', 0, '');
    genTest('', 100, '');

    genTest('a', 0, 'a');
    genTest('a', 1, 'a');
    genTest('a', 2, 'a');

    genTest('ab', 0, 'ab');
    genTest('ab', 1, 'a');
    genTest('ab', 2, 'ab');
    genTest('ab', 3, 'ab');

    genTest('abc', 0, 'abc');
    genTest('abc', 1, 'a');
    genTest('abc', 2, 'ab');
    genTest('abc', 3, 'abc');
    genTest('abc', 4, 'abc');

    genTest('abcd', 0, 'abcd');
    genTest('abcd', 1, 'a');
    genTest('abcd', 2, 'ab');
    genTest('abcd', 3, '...');
    genTest('abcd', 4, 'abcd');
    genTest('abcd', 5, 'abcd');

    genTest('abcdefghijklmnopqrstuvwxyz', 1, 'a');
    genTest('abcdefghijklmnopqrstuvwxyz', 2, 'ab');
    genTest('abcdefghijklmnopqrstuvwxyz', 3, '...');
    genTest('abcdefghijklmnopqrstuvwxyz', 4, '...z');
    genTest('abcdefghijklmnopqrstuvwxyz', 5, 'a...z');
    genTest('abcdefghijklmnopqrstuvwxyz', 6, 'a...yz');
    genTest('abcdefghijklmnopqrstuvwxyz', 7, 'ab...yz');
    genTest('abcdefghijklmnopqrstuvwxyz', 8, 'ab...xyz');
    genTest('abcdefghijklmnopqrstuvwxyz', 9, 'abc...xyz');
    genTest('abcdefghijklmnopqrstuvwxyz', 10, 'abc...wxyz');
    genTest('abcdefghijklmnopqrstuvwxyz', 25, 'abcdefghijk...pqrstuvwxyz');
    genTest('abcdefghijklmnopqrstuvwxyz', 25, 'abcdefghijk...pqrstuvwxyz');
    genTest('abcdefghijklmnopqrstuvwxyz', 26, 'abcdefghijklmnopqrstuvwxyz');
});
