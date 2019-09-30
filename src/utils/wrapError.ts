/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { parseError } from "vscode-azureextensionui";

/**
 * Wrap an existing error with a new error that contains the previous error as just a "Detail".
 *
 * Example:
 *   let wrapped = wrapError(new Error('CPU on strike'), 'Unable to process banking account.');
 *   console.log(parseError(wrapped).message) => 'Unable to process banking account. Details: CPU on strike'
 */
// tslint:disable-next-line:no-any
export function wrapError(innerError: any, outerMessage: string): Error {
    let parsed = parseError(innerError);
    let mergedMessage = `${outerMessage} Details: ${parsed.message}`;

    // We could consider attaching the inner error but right now telemetry doesn't do anything with it
    return new Error(mergedMessage);
}

export async function wrapDockerodeENOENT<T>(callback: () => Promise<T>): Promise<T> {
    try {
        return await callback();
    } catch (err) {
        const error = parseError(err);

        if (error && error.errorType === 'ENOENT') {
            throw new Error(`Failed to connect. Is Docker installed and running? Error: ${error.message}`);
        }

        throw err;
    }
}
