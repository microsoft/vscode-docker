/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import { openExternal } from '../utils/openExternal';
import { isMac, isWindows } from '../utils/osUtils';
import { MacDockerInstaller, WindowsDockerInstaller } from './dockerInstaller';

export async function installDocker(context: IActionContext): Promise<void> {
    if (isWindows()) {
        await (new WindowsDockerInstaller()).downloadAndInstallDocker(context);
    } else if (isMac()) {
        await (new MacDockerInstaller()).downloadAndInstallDocker(context);
    } else {
        await openExternal('https://aka.ms/download-docker-linux-vscode');
    }
}
