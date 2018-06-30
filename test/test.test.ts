/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

suite("Verify tests are running - this should be removed once there are actual tests", () => {
    test("test", async () => {
        assert.equal(true, true);
    });
});
