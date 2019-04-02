/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { env, Uri } from 'vscode';

export async function openExternal(path: string, throwErrorOnFailure: boolean = false): Promise<void> {
    let uri = Uri.parse(path);
    let successful: boolean = await env.openExternal(uri);
    if (!successful && throwErrorOnFailure) {
        throw new Error(`Opening ${path} was unsuccessful`);
    }
    return;
}
