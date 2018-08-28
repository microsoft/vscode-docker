/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as assertEx from './assertEx';
import { commands, OutputChannel, window } from 'vscode';
import { ext } from '../extensionVariables';
import { Suite, Test, Context } from 'mocha';
import { TestTerminalProvider } from '../commands/utils/TerminalProvider';
import { TestUserInput } from 'vscode-azureextensionui';

const registryContainerName = 'test-registry';

suite("Custom registries", async function (this: Suite): Promise<void> {
    this.timeout(Math.max(60 * 1000 * 3, this.timeout()));

    const outputChannel: OutputChannel = window.createOutputChannel('Docker extension tests');
    ext.outputChannel = outputChannel;

    let testTerminalProvider = new TestTerminalProvider();
    ext.terminalProvider = testTerminalProvider;
    let registryTerminal = await testTerminalProvider.createTerminal('custom registry');

    async function stopRegistry(): Promise<void> {
        await registryTerminal.execute(
            [
                `docker stop ${registryContainerName}`,
                `docker rm ${registryContainerName}`,
            ],
            {
                ignoreErrors: true
            }
        );
    }

    suite("localhost", async function (this: Suite): Promise<void> {
        this.timeout(Math.max(60 * 1000 * 5, this.timeout()));

        suiteSetup(async function (this: Context): Promise<void> {
            await stopRegistry();
            await registryTerminal.execute(`docker pull registry`,
                {
                    // docker uses stderr to indicate that it didn't find a local cache and has to download
                    ignoreErrors: true
                });
            await registryTerminal.execute(`docker run -d --rm --name ${registryContainerName} -p 5900:5000 registry`);

            if (false) { // Too inconsistent between terminals
                // Make sure it's running
                // (On some Linux systems, --silent and --show-error are necessary otherwise errors don't go to
                // correct output). On others these may not be valid and may show an error which can be ignored.
                let curlResult = await registryTerminal.execute(`curl http://localhost:5900/v2/_catalog --silent --show-error`);
                assertEx.assertContains(curlResult, '"repositories":');
            }
        });

        suiteTeardown(async function (this: Context): Promise<void> {
            await stopRegistry();
        });

        test("Connect, no auth", async function (this: Context) {
            let input = new TestUserInput([
                'http://localhost:5900',
                ''
            ]);
            ext.ui = input;
            await commands.executeCommand('vscode-docker.connectCustomRegistry');

            // TODO: Verify the node is there (have to start using common tree provider first)
        });

        test("Connect, no auth - keytar not available", async function (this: Context) {
            let oldKeytar = ext.keytar;
            try {
                ext.keytar = undefined;

                let input = new TestUserInput([
                    'http://localhost:5900',
                    ''
                ]);
                ext.ui = input;
                await commands.executeCommand('vscode-docker.connectCustomRegistry');

                // TODO: Verify the node is there (have to start using common tree provider first)
            } finally {
                ext.keytar = oldKeytar;
            }
        });

        test("Connect with credentials");
        test("Publish to Azure app service with credentials");
        test("Disconnect");

        test("Connect with credentials");
        test("Publish to Azure app service with credentials");
        test("Disconnect");
    });
});
