/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { parseError } from 'vscode-azureextensionui';

asdf
/**
 * Creates a new error that consists of a new message, followed by details from
 * an existing error.
 * @param mainMessage
 * @param error
 */
// tslint:disable-next-line:no-any
export function wrapError(mainMessage: string, error: any): Error {
    return new Error(`${mainMessage}\r\nDetails: ${parseError(error).message}`);
}
