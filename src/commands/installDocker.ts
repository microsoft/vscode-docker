/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import LocalOSProvider from '../utils/LocalOSProvider';
import { LinuxDockerInstaller, MacDockerInstaller, WindowsDockerInstaller } from './dockerInstaller';

export async function installDocker(context: IActionContext): Promise<void> {
    const osProvider = new LocalOSProvider();
    const dockerInstaller = osProvider.isMac
        ? new MacDockerInstaller()
        : osProvider.os === 'Windows'
            ? new WindowsDockerInstaller()
            : new LinuxDockerInstaller();
    await dockerInstaller.downloadAndInstallDocker();
}
