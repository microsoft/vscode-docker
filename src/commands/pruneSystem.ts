/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window } from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { callDockerodeWithErrorHandling } from '../utils/callDockerodeWithErrorHandling';
import { convertToMB } from '../utils/convertToMB';

export async function pruneSystem(context: IActionContext): Promise<void> {
    const confirmPrune: string = localize('vscode-docker.commands.pruneSystem.confirm', 'Are you sure you want to remove all stopped containers, dangling images, unused networks, and unused volumes?');
    // no need to check result - cancel will throw a UserCancelledError
    await ext.ui.showWarningMessage(confirmPrune, { modal: true }, { title: 'Remove' });

    /* eslint-disable @typescript-eslint/promise-function-async */
    const containersResult = await callDockerodeWithErrorHandling(() => ext.dockerode.pruneContainers(), context);
    const imagesResult = await callDockerodeWithErrorHandling(() => ext.dockerode.pruneImages(), context);
    const networksResult = await callDockerodeWithErrorHandling(() => ext.dockerode.pruneNetworks(), context);
    const volumesResult = await callDockerodeWithErrorHandling(() => ext.dockerode.pruneVolumes(), context);
    /* eslint-enable @typescript-eslint/promise-function-async */

    const numContainers = (containersResult.ContainersDeleted || []).length;
    const numImages = (imagesResult.ImagesDeleted || []).length;
    const numNetworks = (networksResult.NetworksDeleted || []).length;
    const numVolumes = (volumesResult.VolumesDeleted || []).length;

    const mbReclaimed = convertToMB(containersResult.SpaceReclaimed + imagesResult.SpaceReclaimed + volumesResult.SpaceReclaimed);
    let message = localize('vscode-docker.commands.pruneSystem.removed', 'Removed {0} container(s), {1} image(s), {2} network(s), {3} volume(s) and reclaimed {4}MB of space.', numContainers, numImages, numNetworks, numVolumes, mbReclaimed);
    // don't wait
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    window.showInformationMessage(message);
}
