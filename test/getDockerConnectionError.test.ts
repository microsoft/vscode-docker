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
import { TestUserInput, parseError } from 'vscode-azureextensionui';
import { testUrl } from './testUrl';
import { internal, getDockerConnectionError } from '../explorer/utils/getDockerConnectionError';

const registryContainerName = 'test-registry';

suite("getDockerConnectionError", async function (this: Suite): Promise<void> {
    testUrl(internal.connectionUrl);

    function testGetDockerConnectionError(platform: NodeJS.Platform, expectedMessage: string): void {
        test(platform, () => {
            let currentPlatform = ext.os.platform;
            try {
                ext.os.platform = platform;
                let err = getDockerConnectionError('Whoops');
                assert.equal(parseError(err).message, expectedMessage)
            } finally {
                ext.os.platform = currentPlatform;
            }
        });
    }

    testGetDockerConnectionError('win32', 'Unable to connect to Docker, is the Docker daemon running? Details: Whoops');
    testGetDockerConnectionError('darwin', 'Unable to connect to Docker, is the Docker daemon running? Details: Whoops');
    testGetDockerConnectionError('linux', 'Unable to connect to Docker, is the Docker daemon running? Please see https://github.com/Microsoft/vscode-docker#im-on-linux-and-get-the-error-unable-to-connect-to-docker-is-the-docker-daemon-running for a possible cause and solution. Details: Whoops');
    testGetDockerConnectionError('freebsd', 'Unable to connect to Docker, is the Docker daemon running? Please see https://github.com/Microsoft/vscode-docker#im-on-linux-and-get-the-error-unable-to-connect-to-docker-is-the-docker-daemon-running for a possible cause and solution. Details: Whoops');
});
