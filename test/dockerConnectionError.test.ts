// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

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
import { TestUserInput, parseError, IActionContext } from 'vscode-azureextensionui';
import { testUrl } from './testUrl';
import { throwDockerConnectionError, internal } from '../explorer/utils/dockerConnectionError';

const registryContainerName = 'test-registry';

suite("throwDockerConnectionError", async function (this: Suite): Promise<void> {
    testUrl(internal.installDockerUrl);
    testUrl(internal.linuxPostInstallUrl);
    testUrl(internal.troubleshootingUrl);

    function testThrowDockerConnectionError(platform: NodeJS.Platform, expectedMessage: string): void {
        test(platform, () => {
            let currentPlatform = ext.os.platform;
            let actionContext: IActionContext = {
                measurements: {},
                properties: {},
            };
            try {
                ext.os.platform = platform;
                throwDockerConnectionError(actionContext, 'Whoops');
            } catch (err) {
                assert.equal(parseError(err).message, expectedMessage);
                assert.equal(actionContext.suppressErrorDisplay, true);
            } finally {
                ext.os.platform = currentPlatform;
            }
        });
    }

    testThrowDockerConnectionError('win32', 'Unable to connect to Docker, is the Docker daemon running? Details: Whoops');
    testThrowDockerConnectionError('darwin', 'Unable to connect to Docker, is the Docker daemon running? Details: Whoops');
    testThrowDockerConnectionError('linux', 'Unable to connect to Docker, is the Docker daemon running? Please see https://github.com/Microsoft/vscode-docker#im-on-linux-and-get-the-error-unable-to-connect-to-docker-is-the-docker-daemon-running for a possible cause and solution. Details: Whoops');
    testThrowDockerConnectionError('freebsd', 'Unable to connect to Docker, is the Docker daemon running? Please see https://github.com/Microsoft/vscode-docker#im-on-linux-and-get-the-error-unable-to-connect-to-docker-is-the-docker-daemon-running for a possible cause and solution. Details: Whoops');
});
