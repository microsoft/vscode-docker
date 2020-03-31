/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { callDockerodeWithErrorHandling } from '../../utils/callDockerode';
import { convertToMB } from '../../utils/convertToMB';

export async function pruneImages(context: IActionContext): Promise<void> {
    const confirmPrune: string = localize('vscode-docker.commands.images.prune.confirm', 'Are you sure you want to remove all dangling images?');
    // no need to check result - cancel will throw a UserCancelledError
    await ext.ui.showWarningMessage(confirmPrune, { modal: true }, { title: localize('vscode-docker.commands.images.prune.remove', 'Remove') });

    await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: localize('vscode-docker.commands.images.pruning', 'Pruning images...') },
        async () => {
            const result = await callDockerodeWithErrorHandling(async () => ext.dockerode.pruneImages(), context);

            const numDeleted = (result.ImagesDeleted || []).length;
            const mbReclaimed = convertToMB(result.SpaceReclaimed);
            let message = localize('vscode-docker.commands.images.prune.removed', 'Removed {0} images(s) and reclaimed {1} MB of space.', numDeleted, mbReclaimed);
            // don't wait
            /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
            vscode.window.showInformationMessage(message);
        }
    );
}
