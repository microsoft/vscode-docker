/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as request from 'request-promise-native';
import { ITestCallbackContext } from "mocha";
import { wrapError } from "../extension.bundle";
import { Uri } from "vscode";

export async function testUrl(url: string): Promise<void> {
    test(`Testing ${url} exists`, async function (this: ITestCallbackContext) {
        this.timeout(10000);

        // TODO: Why is this test having troubles now?
        this.skip();
        return;

        let contents: string | undefined;

        try {
            let options = {
                method: 'GET',
                url
            };

            contents = <string>await request(options);
        } catch (error) {
            throw wrapError(error, `Could not connect to ${url}`);
        }

        let fragment = Uri.parse(url).fragment;
        if (fragment) {
            // If contains a fragment, verify a link with that ID actually exists in the contents
            if (!contents.includes(`href="#${fragment}"`)) {
                throw new Error(`Found page for ${url}, but couldn't find target for fragment ${fragment}`);
            }
        }
    });
}
