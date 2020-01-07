/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable unicorn/filename-case */

import { parseError } from "vscode-azureextensionui";

export async function wrapDockerodeENOENT<T>(dockerodeCallback: () => Promise<T>): Promise<T> {
    try {
        return await dockerodeCallback();
    } catch (err) {
        const error = parseError(err);

        if (error && error.errorType === 'ENOENT') {
            throw new Error(`Failed to connect. Is Docker installed and running? Error: ${error.message}`);
        }

        throw err;
    }
}
