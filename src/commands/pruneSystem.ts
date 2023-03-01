/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../extensionVariables';
import { convertToMB } from '../utils/convertToMB';

export async function pruneSystem(context: IActionContext): Promise<void> {
    const confirmPrune: string = vscode.l10n.t('Are you sure you want to remove all stopped containers, dangling images, unused networks, and unused volumes? Removing volumes may result in data loss!');
    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmPrune, { modal: true }, { title: 'Remove' });

    await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: vscode.l10n.t('Pruning system...') },
        async () => {
            const containersResult = await ext.runWithDefaults(client =>
                client.pruneContainers({})
            );
            const imagesResult = await ext.runWithDefaults(client =>
                client.pruneImages({})
            );
            const networksResult = await ext.runWithDefaults(client =>
                client.pruneNetworks({})
            );
            const volumesResult = await ext.runWithDefaults(client =>
                client.pruneVolumes({})
            );

            let message: string;
            if (containersResult?.containersDeleted?.length && Number.isInteger(containersResult?.spaceReclaimed) &&
                imagesResult?.imageRefsDeleted?.length && Number.isInteger(imagesResult?.spaceReclaimed) &&
                networksResult?.networksDeleted?.length &&
                volumesResult?.volumesDeleted?.length && Number.isInteger(volumesResult?.spaceReclaimed)) {
                message = vscode.l10n.t(
                    'Removed {0} container(s), {1} image(s), {2} network(s), {3} volume(s) and reclaimed {4} MB of space.',
                    containersResult.containersDeleted.length,
                    imagesResult.imageRefsDeleted.length,
                    networksResult.networksDeleted.length,
                    volumesResult.volumesDeleted.length,
                    convertToMB(containersResult.spaceReclaimed + imagesResult.spaceReclaimed + volumesResult.spaceReclaimed)
                );
            } else {
                message = vscode.l10n.t('Removed stopped containers, dangling images, unused networks, and unused volumes.');
            }

            // Don't wait
            void vscode.window.showInformationMessage(message);
        }
    );
}
