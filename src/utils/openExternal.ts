/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export async function openExternal(path: string, throwErrorOnFailure: boolean = false): Promise<void> {
    await vscode.env.openExternal(vscode.Uri.parse(path));
}
