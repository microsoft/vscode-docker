/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { commands, Uri } from 'vscode';
import { localize } from '../localize';

export async function openExternal(path: string, throwErrorOnFailure: boolean = false): Promise<void> {
    let uri = Uri.parse(path);
    let successful: boolean = await commands.executeCommand('vscode.open', uri);
    if (!successful && throwErrorOnFailure) {
        throw new Error(localize('vscode-docker.utils.openExternal.error', 'Opening {0} was unsuccessful', path));
    }
    return;
}
