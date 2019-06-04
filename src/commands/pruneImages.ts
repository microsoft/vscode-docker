/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';

export async function pruneImages(_context: IActionContext): Promise<void> {
    const confirmPrune: string = "Are you sure you want to remove all dangling images?";
    // no need to check result - cancel will throw a UserCancelledError
    await ext.ui.showWarningMessage(confirmPrune, { modal: true }, { title: 'Remove' });

    const terminal = ext.terminalProvider.createTerminal("docker prune");
    terminal.sendText('docker image prune -f');
    terminal.show();
}
