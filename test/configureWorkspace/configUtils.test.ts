/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { splitPorts } from "../../extension.bundle";
import * as assert from 'assert';

suite('(unit) configureWorkspace/configUtils', () => {
    suite('splitPorts', () => {
        function genTest(s: string, expected: number[]): void {
            test(`${String(s)}`, () => {
                let s2 = splitPorts(s);
                assert.deepEqual(s2, expected);
            });
        }

        genTest('', []);
        genTest('-1', undefined);
        genTest('1', [1]);
        genTest('80', [80]);
        genTest('65535', [65535]);
        genTest('65536', undefined);

        genTest('80,81', [80, 81]);
        genTest('80, 81', [80, 81]);
        genTest('80;81', undefined);
        genTest('80,81;82', undefined);

        genTest('3;;\'[\'\']?><', undefined);
        genTest('abc', undefined);
        genTest('80,abc', undefined);
    });
});
