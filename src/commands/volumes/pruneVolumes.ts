/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';

export async function pruneVolumes(_context: IActionContext): Promise<void> {
    const confirmPrune: string = "Are you sure you want to remove all unused volumes?";
    // no need to check result - cancel will throw a UserCancelledError
    await ext.ui.showWarningMessage(confirmPrune, { modal: true }, { title: 'Remove' });

    const terminal = ext.terminalProvider.createTerminal("docker prune");
    terminal.sendText('docker volume prune -f');
    terminal.show();
}
