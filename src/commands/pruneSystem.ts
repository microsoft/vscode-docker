/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window } from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { callDockerodeWithErrorHandling } from '../utils/callDockerodeWithErrorHandling';
import { convertToMB } from '../utils/convertToMB';

export async function pruneSystem(context: IActionContext): Promise<void> {
    const confirmPrune: string = "Are you sure you want to remove all stopped containers, dangling images, unused networks, and unused volumes?";
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
    let message = `Removed ${numContainers} container(s), ${numImages} image(s), ${numNetworks} network(s), ${numVolumes} volume(s) and reclaimed ${mbReclaimed}MB of space.`;
    // don't wait
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    window.showInformationMessage(message);
}
