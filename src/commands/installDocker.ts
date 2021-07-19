/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { isMac, isWindows } from '../utils/osUtils';
import { MacDockerInstaller, WindowsDockerInstaller } from './dockerInstaller';
import { openStartPageAfterExtensionUpdate } from './startPage/openStartPage';

export async function installDocker(context: IActionContext): Promise<void> {
    if (isWindows()) {
        await (new WindowsDockerInstaller()).downloadAndInstallDocker(context);
    } else if (isMac()) {
        await (new MacDockerInstaller()).downloadAndInstallDocker(context);
    } else {
        await vscode.env.openExternal(vscode.Uri.parse('https://aka.ms/download-docker-linux-vscode'));
    }

    void openStartPageAfterExtensionUpdate();
}
