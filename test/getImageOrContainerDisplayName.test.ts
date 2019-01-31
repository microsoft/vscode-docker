/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { getImageOrContainerDisplayName } from '../extension.bundle';

suite('getImageOrContainerDisplayName', () => {
    function genTest(fullName: string, trim: boolean, max: number, expected: string): void {
        test(`${String(fullName)}: ${trim}/${max}`, () => {
            let s2 = getImageOrContainerDisplayName(fullName, trim, max);
            assert.equal(s2, expected);
        });
    }

    genTest('', false, 0, '');
    genTest('', false, 1, '');
    genTest('', true, 0, '');
    genTest('', true, 1, '');

    genTest('a', false, 1, 'a');
    genTest('abcdefghijklmnopqrstuvwxyz', false, 0, 'abcdefghijklmnopqrstuvwxyz');
    genTest('abcdefghijklmnopqrstuvwxyz', false, 1, 'abcdefghijklmnopqrstuvwxyz');
    genTest('abcdefghijklmnopqrstuvwxyz', false, 25, 'abcdefghijklmnopqrstuvwxyz');
    genTest('abcdefghijklmnopqrstuvwxyz', false, 90, 'abcdefghijklmnopqrstuvwxyz');

    // No registry - use full image name
    genTest('abcdefghijklmnopqrstuvwxyz', true, 0, 'abcdefghijklmnopqrstuvwxyz');
    genTest('abcdefghijklmnopqrstuvwxyz', true, 1, 'abcdefghijklmnopqrstuvwxyz');
    genTest('abcdefghijklmnopqrstuvwxyz', true, 2, 'abcdefghijklmnopqrstuvwxyz');
    genTest('abcdefghijklmnopqrstuvwxyz', true, 10, 'abcdefghijklmnopqrstuvwxyz');
    genTest('abcdefghijklmnopqrstuvwxyz', true, 99, 'abcdefghijklmnopqrstuvwxyz');

    genTest('abcdefghijklmnopqrstuvwxyz:latest', true, 10, 'abcdefghijklmnopqrstuvwxyz:latest');

    // Registry + one level
    genTest('a/abcdefghijklmnopqrstuvwxyz:latest', true, 10, 'a/abcdefghijklmnopqrstuvwxyz:latest');
    genTest('abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest', true, 10, 'abc...wxyz/abcdefghijklmnopqrstuvwxyz:latest');

    // Registry + two or more levels
    genTest('abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest', true, 10, 'abc...wxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest');
    genTest('abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest', true, 10, 'abc...wxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz/abcdefghijklmnopqrstuvwxyz:latest');

    // Real examples
    genTest('registry.gitlab.com/sweatherford/hello-world/sub:latest', true, 7, 're...om/sweatherford/hello-world/sub:latest');
});
