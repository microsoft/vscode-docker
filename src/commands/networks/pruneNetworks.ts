/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';

export async function pruneNetworks(context: IActionContext): Promise<void> {
    const confirmPrune: string = localize('vscode-docker.commands.networks.prune.confirm', 'Are you sure you want to remove all unused networks?');
    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmPrune, { modal: true }, { title: localize('vscode-docker.commands.networks.prune.remove', 'Remove') });

    await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: localize('vscode-docker.commands.networks.pruning', 'Pruning networks...') },
        async () => {
            const result = await ext.defaultShellCR()(ext.containerClient.pruneNetworks({}));

            let message: string;
            if (result?.networksDeleted?.length) {
                message = localize('vscode-docker.commands.networks.prune.removed', 'Removed {0} unused networks(s).', result.networksDeleted.length);
            } else {
                message = localize('vscode-docker.commands.networks.prune.removed2', 'Removed dangling networks.');
            }

            // Don't wait
            void vscode.window.showInformationMessage(message);
        }
    );
}
