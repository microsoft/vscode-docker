/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import LocalOSProvider from '../utils/LocalOSProvider';
import { openExternal } from '../utils/openExternal';
import { MacDockerInstaller, WindowsDockerInstaller } from './dockerInstaller';

export async function installDocker(context: IActionContext): Promise<void> {
    const osProvider = new LocalOSProvider();

    if (osProvider.os === 'Windows') {
        await (new WindowsDockerInstaller()).downloadAndInstallDocker(context);
    } else if (osProvider.os === 'Mac') {
        await (new MacDockerInstaller()).downloadAndInstallDocker(context);
    } else {
        await openExternal('https://aka.ms/download-docker-linux-vscode');
    }
}
