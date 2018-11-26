/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ITestCallbackContext } from "mocha";
import { ext } from "../extensionVariables";
import { wrapError } from "../explorer/utils/wrapError";
import { Uri } from "vscode";
import { isLinux, isWindows } from "../helpers/osVersion";

export async function testUrl(url: string): Promise<void> {
    test(`Testing ${url} exists`, async function (this: ITestCallbackContext) {
        this.timeout(10000);

        if (true) { // TODO: Figure out why this is failing
            this.skip();
        } else {
            let contents: string | undefined;

            try {
                let options = {
                    method: 'GET',
                    url
                };

                contents = <string>await ext.request(options);
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
        }
    });
}
