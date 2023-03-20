/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DialogResponses, IActionContext, UserCancelledError } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';

export async function installExtension(context: IActionContext, extensionId: string, message: string): Promise<void> {
    const extension = vscode.extensions.getExtension(extensionId);
    if (extension) {
        // Extension is already installed
        return;
    }

    const install: vscode.MessageItem = {
        title: vscode.l10n.t('Install')
    };

    const cancel = DialogResponses.cancel;

    const result = await context.ui.showWarningMessage(message, { modal: true }, install, cancel);

    if (result === install) {
        // Open the extension marketplace page
        await vscode.commands.executeCommand('extension.open', extensionId);

        // Start the installation of the extension--consent is implied since they clicked "Install"
        await vscode.commands.executeCommand('workbench.extensions.installExtension', extensionId);
    } else {
        throw new UserCancelledError('installExtensionDeclined');
    }
}
