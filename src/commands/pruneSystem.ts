/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { convertToMB } from '../utils/convertToMB';

export async function pruneSystem(context: IActionContext): Promise<void> {
    const confirmPrune: string = localize('vscode-docker.commands.pruneSystem.confirm', 'Are you sure you want to remove all stopped containers, dangling images, unused networks, and unused volumes? Removing volumes may result in data loss!');
    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmPrune, { modal: true }, { title: 'Remove' });

    await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: localize('vscode-docker.commands.pruneSystem.pruning', 'Pruning system...') },
        async () => {
            const containersResult = await ext.dockerClient.pruneContainers(context);
            const imagesResult = await ext.dockerClient.pruneImages(context);
            const networksResult = await ext.dockerClient.pruneNetworks(context);
            const volumesResult = await ext.dockerClient.pruneVolumes(context);

            const mbReclaimed = convertToMB(containersResult.SpaceReclaimed + imagesResult.SpaceReclaimed + volumesResult.SpaceReclaimed);
            const message = localize('vscode-docker.commands.pruneSystem.removed', 'Removed {0} container(s), {1} image(s), {2} network(s), {3} volume(s) and reclaimed {4} MB of space.', containersResult.ObjectsDeleted, imagesResult.ObjectsDeleted, networksResult.ObjectsDeleted, volumesResult.ObjectsDeleted, mbReclaimed);
            // don't wait
            /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
            vscode.window.showInformationMessage(message);
        }
    );
}
