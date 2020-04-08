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
    if (osProvider.os === 'Linux') {
        // eslint-disable-next-line @typescript-eslint/tslint/config
        await openExternal('https://aka.ms/download-docker-linux-vscode');
    } else {
        const dockerInstaller = osProvider.isMac
            ? new MacDockerInstaller()
            : new WindowsDockerInstaller();
        await dockerInstaller.downloadAndInstallDocker();
    }
}
