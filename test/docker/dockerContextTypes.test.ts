/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { DockerContextTypes } from '../../extension.bundle';

const testData: { left: DockerContextTypes, right: DockerContextTypes, expect: boolean }[] = [
    { left: DockerContextTypes.downlevel, right: DockerContextTypes.aci, expect: false },
]

suite('(unit) DockerContextTypes tests', () => {
    testData.forEach(t => {
        test(`${t.left.toString()} & ${t.right.toString()} == ${t.expect.toString()}`, () => {
            assert.equal(Boolean(t.left & t.right), t.expect, '');
        });
    });
});
