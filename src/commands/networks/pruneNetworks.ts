/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window } from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { wrapDockerodeENOENT } from '../../utils/wrapError';

export async function pruneNetworks(_context: IActionContext): Promise<void> {
    const confirmPrune: string = "Are you sure you want to remove all unused networks?";
    // no need to check result - cancel will throw a UserCancelledError
    await ext.ui.showWarningMessage(confirmPrune, { modal: true }, { title: 'Remove' });

    const result = await wrapDockerodeENOENT(() => ext.dockerode.pruneNetworks());

    const numDeleted = (result.NetworksDeleted || []).length;
    let message = `Removed ${numDeleted} networks(s).`;
    // don't wait
    window.showInformationMessage(message);
}
