/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Adapted from https://code.visualstudio.com/api/working-with-extensions/testing-extension

import * as path from 'path';
import { runTests } from '@vscode/test-electron';
import { TestOptions } from '@vscode/test-electron/out/runTest';

async function main(): Promise<void> {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // The path to test runner
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './index');

    // The workspace
    const testWorkspacePath = path.resolve(__dirname, '../../src/test/test.code-workspace');

    const options: TestOptions = {
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: [testWorkspacePath, '--install-extension', 'ms-vscode.azure-account'],
        extensionTestsEnv: {
            DEBUGTELEMETRY: '1',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            MOCHA_grep: process.env.MOCHA_grep,
        },
    };

    console.log(`Test options: ${JSON.stringify(options)}`);

    // Download VS Code, unzip it and run the integration test
    try {
        await runTests(options);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
