/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { convertToMB } from '../../utils/convertToMB';

export async function pruneContainers(context: IActionContext): Promise<void> {
    const confirmPrune: string = localize('vscode-docker.commands.containers.prune.confirm', 'Are you sure you want to remove all stopped containers?');
    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmPrune, { modal: true }, { title: localize('vscode-docker.commands.containers.prune.remove', 'Remove') });

    await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: localize('vscode-docker.commands.containers.pruning', 'Pruning containers...') },
        async () => {
            const result = await ext.runWithDefaults(client =>
                client.pruneContainers({})
            );

            let message: string;
            if (result?.containersDeleted?.length && Number.isInteger(result?.spaceReclaimed)) {
                message = localize('vscode-docker.commands.containers.prune.removed', 'Removed {0} stopped container(s) and reclaimed {1} MB of space.', result.containersDeleted.length, convertToMB(result.spaceReclaimed));
            } else {
                message = localize('vscode-docker.commands.containers.prune.removed2', 'Removed stopped containers.');
            }

            // Don't wait
            void vscode.window.showInformationMessage(message);
        }
    );
}
