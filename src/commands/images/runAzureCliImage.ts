/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DialogResponses, IActionContext } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as os from 'os';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { executeAsTask } from '../../utils/executeAsTask';
import { getDockerOSType } from '../../utils/osUtils';

export async function runAzureCliImage(context: IActionContext): Promise<void> {
    const osType = await getDockerOSType(context);
    context.telemetry.properties.dockerOSType = osType;

    if (osType === "windows") {
        const message = localize('vscode-docker.commands.images.runAzureCli.linuxOnly', 'Currently, you can only run the Azure CLI when running Linux based containers.');
        if (await vscode.window.showErrorMessage(message, DialogResponses.learnMore) === DialogResponses.learnMore) {
            await vscode.env.openExternal(vscode.Uri.parse('https://docs.docker.com/docker-for-windows/#/switch-between-windows-and-linux-containers'));
        }
    } else {
        const option: string = process.platform === 'linux' ? '--net=host' : '';

        // volume map .azure folder so don't have to log in every time
        const homeDir: string = process.platform === 'win32' ? os.homedir().replace(/\\/g, '/') : os.homedir();
        let vol: string = '';

        if (await fse.pathExists(`${homeDir}/.azure`)) {
            vol += ` -v ${homeDir}/.azure:/root/.azure`;
        }

        if (await fse.pathExists(`${homeDir}/.ssh`)) {
            vol += ` -v ${homeDir}/.ssh:/root/.ssh`;
        }

        if (await fse.pathExists(`${homeDir}/.kube`)) {
            vol += ` -v ${homeDir}/.kube:/root/.kube`;
        }

        const workspaceFolder = vscode.workspace?.workspaceFolders?.[0];
        if (workspaceFolder) {
            vol += ` -v ${workspaceFolder.uri.fsPath}:/workspace`;
        }

        await executeAsTask(context, `${ext.dockerContextManager.getDockerCommand(context)} run ${option} ${vol.trim()} -it --rm mcr.microsoft.com/azure-cli:latest`, 'Azure CLI', { addDockerEnv: true, focus: true });
    }
}
