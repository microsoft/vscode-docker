/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { InspectMode, NodePackage, inferCommand, inferPackageName } from '../../utils/nodeUtils';

suite('(unit) utils/nodeUtils', () => {
    suite('inferPackageName', () => {
        test('No package', async () => {
            const packageName = await inferPackageName(undefined, '/Users/user/app/package.json');

            assert.equal(packageName, 'app', 'The inferred package name should be the parent folder name if there is no package');
        });

        test('No package name', async () => {
            const packageName = await inferPackageName({}, '/Users/user/app/package.json');

            assert.equal(packageName, 'app', 'The inferred package name should be the parent folder name if no name is specified in the package');
        });

        test('Empty package name', async () => {
            const packageName = await inferPackageName({ name: '' }, '/Users/user/app/package.json');

            assert.equal(packageName, 'app', 'The inferred package name should be the parent folder name if an empty name is specified in the package');
        });

        test('With package name', async () => {
            const packageName = await inferPackageName({ name: 'appname' }, '/Users/user/app/package.json');

            assert.equal(packageName, 'appname', 'The inferred package name should be the name specified in the package');
        });
    });

    suite('inferCommand', () => {
        function inferCommandTest(name: string, nodePackage: NodePackage, inspectMode: InspectMode, inspectPort: number, expectedCommand: string, errorMessage: string) {
            test(name, async () => {
                const command = await inferCommand(nodePackage, inspectMode, inspectPort);

                assert.equal(expectedCommand, command, errorMessage);
            });
        }

        test('No package', async () => {
            await assert.rejects(() => inferCommand(undefined, 'default', 9229), 'An error should be thrown if there is no package');
        });

        test('No scripts or main', async () => {
            await assert.rejects(() => inferCommand({}, 'default', 9229), 'An error should be thrown if there is no recognized NPM script or main script');
        });

        inferCommandTest(
            'With start script and main',
            { main: './bin/www1', scripts: { start: 'node ./bin/www2' } },
            'default',
            9229,
            'node --inspect=0.0.0.0:9229 ./bin/www2',
            'A recognized start script should be chosen above a main script');

        inferCommandTest(
            'With case sensitive start script',
            { main: './bin/www1', scripts: { start: 'Node ./bin/www2' } },
            'default',
            9229,
            'node --inspect=0.0.0.0:9229 ./bin/www2',
            'A recognized start script should be chosen above a main script');

        inferCommandTest(
            'With nodejs start script',
            { main: './bin/www1', scripts: { start: 'nodejs ./bin/www2' } },
            'default',
            9229,
            'node --inspect=0.0.0.0:9229 ./bin/www2',
            'Use of nodejs links should be swapped with direct use of node');

        inferCommandTest(
            'Start script with preceeding environment',
            { main: './bin/www1', scripts: { start: 'NODE_ENV=production node ./bin/www2' } },
            'default',
            9229,
            'node --inspect=0.0.0.0:9229 ./bin/www2',
            'Preceeding environment should be ignored');

        inferCommandTest(
            'With unrecognized start script and main',
            { main: './bin/www1', scripts: { start: 'mynode ./bin/www2' } },
            'default',
            9229,
            'node --inspect=0.0.0.0:9229 ./bin/www1',
            'Should default to the main script if the start script is not recognized');

        inferCommandTest(
            'With no scripts but main',
            { main: './bin/www' },
            'default',
            9229,
            'node --inspect=0.0.0.0:9229 ./bin/www',
            'Should default to the main script when no scripts exist');

        inferCommandTest(
            'With no scripts but main with break',
            { main: './bin/www' },
            'break',
            9229,
            'node --inspect-brk=0.0.0.0:9229 ./bin/www',
            'Should use --inspect-brk argument for break mode');

        inferCommandTest(
            'With no start script but main',
            { main: './bin/www', scripts: {} },
            'default',
            9229,
            'node --inspect=0.0.0.0:9229 ./bin/www',
            'Should default to the main script when no start script exists');
    });
});

