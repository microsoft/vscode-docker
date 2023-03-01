/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';

export async function pruneNetworks(context: IActionContext): Promise<void> {
    const confirmPrune: string = vscode.l10n.t('Are you sure you want to remove all unused networks?');
    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmPrune, { modal: true }, { title: vscode.l10n.t('Remove') });

    await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: vscode.l10n.t('Pruning networks...') },
        async () => {
            const result = await ext.runWithDefaults(client =>
                client.pruneNetworks({})
            );

            let message: string;
            if (result?.networksDeleted?.length) {
                message = vscode.l10n.t('Removed {0} unused networks(s).', result.networksDeleted.length);
            } else {
                message = vscode.l10n.t('Removed unused networks.');
            }

            // Don't wait
            void vscode.window.showInformationMessage(message);
        }
    );
}
