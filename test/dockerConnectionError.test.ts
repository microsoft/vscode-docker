// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { Suite } from 'mocha';
import { IActionContext, parseError } from 'vscode-azureextensionui';
import { ext, internal, throwDockerConnectionError } from '../extension.bundle';
import { testUrl } from './testUrl';

suite("throwDockerConnectionError", async function (this: Suite): Promise<void> {
    this.timeout(4000);

    suite("connection error URLs", async function (this: Suite): Promise<void> {
        testUrl(internal.installDockerUrl);
        testUrl(internal.linuxPostInstallUrl);
        testUrl(internal.troubleshootingUrl);
    });

    function testThrowDockerConnectionError(platform: NodeJS.Platform, expectedMessage: string): void {
        test(platform, () => {
            let currentPlatform = ext.os.platform;
            let context: IActionContext = {
                telemetry: { properties: {}, measurements: {} },
                errorHandling: {}
            };
            try {
                ext.os.platform = platform;
                throwDockerConnectionError(context, 'Whoops');
            } catch (err) {
                assert.equal(parseError(err).message, expectedMessage);
                assert.equal(context.errorHandling.suppressDisplay, true);
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
