/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { convertToMB } from '../../utils/convertToMB';

export async function pruneVolumes(context: IActionContext): Promise<void> {
    const confirmPrune: string = vscode.l10n.t('Are you sure you want to remove all unused volumes? Removing volumes may result in data loss!');
    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmPrune, { modal: true }, { title: vscode.l10n.t('Remove') });

    await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: vscode.l10n.t('Pruning volumes...') },
        async () => {
            const result = await ext.runWithDefaults(client =>
                client.pruneVolumes({})
            );

            let message: string;
            if (result?.volumesDeleted?.length && Number.isInteger(result?.spaceReclaimed)) {
                message = vscode.l10n.t('Removed {0} unused volume(s) and reclaimed {1} MB of space.', result.volumesDeleted.length, convertToMB(result.spaceReclaimed));
            } else {
                message = vscode.l10n.t('Removed unused volumes.');
            }

            // Don't wait
            void vscode.window.showInformationMessage(message);
        }
    );
}
