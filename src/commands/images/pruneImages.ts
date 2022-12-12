/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { convertToMB } from '../../utils/convertToMB';

export async function pruneImages(context: IActionContext): Promise<void> {
    const confirmPrune: string = localize('vscode-docker.commands.images.prune.confirm', 'Are you sure you want to remove all dangling images?');
    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmPrune, { modal: true }, { title: localize('vscode-docker.commands.images.prune.remove', 'Remove') });

    await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: localize('vscode-docker.commands.images.pruning', 'Pruning images...') },
        async () => {
            const result = await ext.runWithDefaults(client =>
                client.pruneImages({})
            );

            let message: string;
            if (result?.imageRefsDeleted?.length && Number.isInteger(result?.spaceReclaimed)) {
                message = localize('vscode-docker.commands.images.prune.removed', 'Removed {0} dangling image(s) and reclaimed {1} MB of space.', result.imageRefsDeleted.length, convertToMB(result.spaceReclaimed));
            } else {
                message = localize('vscode-docker.commands.images.prune.removed2', 'Removed dangling images.');
            }

            // Don't wait
            void vscode.window.showInformationMessage(message);
        }
    );
}
