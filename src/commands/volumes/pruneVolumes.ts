/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from "../../localize";
import { callDockerodeWithErrorHandling } from '../../utils/callDockerodeWithErrorHandling';
import { convertToMB } from '../../utils/convertToMB';

export async function pruneVolumes(context: IActionContext): Promise<void> {
    const confirmPrune: string = localize('vscode-docker.commands.volumes.prune.confirm', 'Are you sure you want to remove all unused volumes? Removing volumes may result in data loss!');
    // no need to check result - cancel will throw a UserCancelledError
    await ext.ui.showWarningMessage(confirmPrune, { modal: true }, { title: localize('vscode-docker.commands.volumes.prune.remove', 'Remove') });

    await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: localize('vscode-docker.commands.volumes.pruning', 'Pruning volumes...') },
        async () => {
            /* eslint-disable-next-line @typescript-eslint/promise-function-async */
            const result = await callDockerodeWithErrorHandling(() => ext.dockerode.pruneVolumes(), context);

            const numDeleted = (result.VolumesDeleted || []).length;
            const mbReclaimed = convertToMB(result.SpaceReclaimed);
            let message = localize('vscode-docker.commands.volumes.prune.removed', 'Removed {0} volumes(s) and reclaimed {1} MB of space.', numDeleted, mbReclaimed);
            // don't wait
            /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
            vscode.window.showInformationMessage(message);
        }
    );
}
