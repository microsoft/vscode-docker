/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as os from 'os';
import * as vscode from 'vscode';
import { DialogResponses, IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { openExternal } from '../../utils/openExternal';
import { getDockerOSType } from '../../utils/osUtils';

export async function runAzureCliImage(context: IActionContext): Promise<void> {
    let osType = await getDockerOSType(context);
    context.telemetry.properties.dockerOSType = osType;

    if (osType === "windows") {
        const message = localize('vscode-docker.commands.images.runAzureCli.linuxOnly', 'Currently, you can only run the Azure CLI when running Linux based containers.');
        if (await vscode.window.showErrorMessage(message, DialogResponses.learnMore) === DialogResponses.learnMore) {
            await openExternal('https://docs.docker.com/docker-for-windows/#/switch-between-windows-and-linux-containers');
        }
    } else {
        const option: string = process.platform === 'linux' ? '--net=host' : '';

        // volume map .azure folder so don't have to log in every time
        const homeDir: string = process.platform === 'win32' ? os.homedir().replace(/\\/g, '/') : os.homedir();
        let vol: string = '';

        if (fse.existsSync(`${homeDir}/.azure`)) {
            vol += ` -v ${homeDir}/.azure:/root/.azure`;
        }
        if (fse.existsSync(`${homeDir}/.ssh`)) {
            vol += ` -v ${homeDir}/.ssh:/root/.ssh`;
        }
        if (fse.existsSync(`${homeDir}/.kube`)) {
            vol += ` -v ${homeDir}/.kube:/root/.kube`;
        }

        const cmd: string = `docker run ${option} ${vol.trim()} -it --rm azuresdk/azure-cli-python:latest`;
        const terminal: vscode.Terminal = ext.terminalProvider.createTerminal('Azure CLI');
        terminal.sendText(cmd);
        terminal.show();
    }
}
