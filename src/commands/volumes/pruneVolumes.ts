/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../../extensionVariables';
import { l10n } from 'vscode';
import { convertToMB } from '../../utils/convertToMB';

export async function pruneVolumes(context: IActionContext): Promise<void> {
    const confirmPrune: string = l10n.t('Are you sure you want to remove all unused volumes? Removing volumes may result in data loss!');
    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmPrune, { modal: true }, { title: l10n.t('Remove') });

    await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: l10n.t('Pruning volumes...') },
        async () => {
            const result = await ext.runWithDefaults(client =>
                client.pruneVolumes({})
            );

            let message: string;
            if (result?.volumesDeleted?.length && Number.isInteger(result?.spaceReclaimed)) {
                message = l10n.t('Removed {0} unused volume(s) and reclaimed {1} MB of space.', result.volumesDeleted.length, convertToMB(result.spaceReclaimed));
            } else {
                message = l10n.t('Removed unused volumes.');
            }

            // Don't wait
            void vscode.window.showInformationMessage(message);
        }
    );
}
