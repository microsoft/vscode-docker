/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { inferPackageName } from "../../src/utils/nodeUtils";

 suite('utils/nodeUtils', () => {
    suite('inferPackageName', () => {
        test('No package', async () => {
            const packageName = await inferPackageName(undefined, '/Users/user/app/package.json');

            assert.equal(packageName, 'app', 'The inferred package name should be the parent folder name if no package could be obtained');
        });

        test('No package name', async () => {
            const packageName = await inferPackageName({}, '/Users/user/app/package.json');

            assert.equal(packageName, 'app', 'The inferred package name should be the parent folder name if no name is specified in the package');
        });

        test('With package name', async () => {
            const packageName = await inferPackageName({ name: 'appname' }, '/Users/user/app/package.json');

            assert.equal(packageName, 'appname', 'The inferred package name should be the name specified in the package');
        });
    });
 });

