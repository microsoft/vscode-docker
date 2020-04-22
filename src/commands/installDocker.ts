/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as os from 'os';
import { IActionContext } from 'vscode-azureextensionui';
import { localize } from '../localize';
import { DockerExtensionKind, getVSCodeRemoteInfo } from '../utils/getVSCodeRemoteInfo';
import { openExternal } from '../utils/openExternal';
import { MacDockerInstaller, WindowsDockerInstaller } from './dockerInstaller';

export async function installDocker(context: IActionContext): Promise<void> {
    const remoteInfo = getVSCodeRemoteInfo(context);

    if (remoteInfo.extensionKind !== DockerExtensionKind.local) {
        context.errorHandling.suppressReportIssue = true;
        throw new Error(localize('vscode-docker.commands.installDocker.noRemote', 'Docker Desktop cannot be installed in a remote session.'));
    }

    if (os.platform() === 'win32') {
        await (new WindowsDockerInstaller()).downloadAndInstallDocker();
    } else if (os.platform() === 'darwin') {
        await (new MacDockerInstaller()).downloadAndInstallDocker();
    } else {
        await openExternal('https://aka.ms/download-docker-linux-vscode');
    }
}
