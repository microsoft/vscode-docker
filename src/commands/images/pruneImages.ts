/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window } from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { convertToMB } from '../../utils/convertToMB';
import { wrapDockerodeENOENT } from '../../utils/wrapDockerodeENOENT';

export async function pruneImages(_context: IActionContext): Promise<void> {
    const confirmPrune: string = "Are you sure you want to remove all dangling images?";
    // no need to check result - cancel will throw a UserCancelledError
    await ext.ui.showWarningMessage(confirmPrune, { modal: true }, { title: 'Remove' });

    /* eslint-disable-next-line @typescript-eslint/promise-function-async */
    const result = await wrapDockerodeENOENT(() => ext.dockerode.pruneImages());

    const numDeleted = (result.ImagesDeleted || []).length;
    const mbReclaimed = convertToMB(result.SpaceReclaimed);
    let message = `Removed ${numDeleted} images(s) and reclaimed ${mbReclaimed}MB of space.`;
    // don't wait
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    window.showInformationMessage(message);
}
