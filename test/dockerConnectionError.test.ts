// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ext, throwDockerConnectionError, internal } from '../extension';
import { Suite, Test, Context } from 'mocha';
import { parseError, IActionContext } from 'vscode-azureextensionui';
import { testUrl } from './testUrl';

suite("throwDockerConnectionError", async function (this: Suite): Promise<void> {
    suite("connection error URLs", async function (this: Suite): Promise<void> {
        testUrl(internal.installDockerUrl);
        testUrl(internal.linuxPostInstallUrl);
        testUrl(internal.troubleshootingUrl);
    });

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


    testThrowDockerConnectionError('win32', 'Unable to connect to Docker. Please make sure you have installed Docker and that it is running. Details: Whoops');
    testThrowDockerConnectionError('darwin', 'Unable to connect to Docker. Please make sure you have installed Docker and that it is running. Details: Whoops');
    testThrowDockerConnectionError('linux', 'Unable to connect to Docker. Please make sure you have installed Docker and that it is running. Also make sure you\'ve followed the Linux post-install instructions "Manage Docker as a non-root user". Details: Whoops');
    testThrowDockerConnectionError('freebsd', 'Unable to connect to Docker. Please make sure you have installed Docker and that it is running. Also make sure you\'ve followed the Linux post-install instructions "Manage Docker as a non-root user". Details: Whoops');
});
