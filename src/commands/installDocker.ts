/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as os from 'os';
import { IActionContext } from 'vscode-azureextensionui';
import { openExternal } from '../utils/openExternal';
import { MacDockerInstaller, WindowsDockerInstaller } from './dockerInstaller';

export async function installDocker(context: IActionContext): Promise<void> {
    if (os.platform() === 'win32') {
        await (new WindowsDockerInstaller()).downloadAndInstallDocker();
    } else if (os.platform() === 'darwin') {
        await (new MacDockerInstaller()).downloadAndInstallDocker();
    } else {
        await openExternal('https://aka.ms/download-docker-linux-vscode');
    }
}
