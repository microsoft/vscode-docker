/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { parseError } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { getCoreNodeModule } from '../utils/getCoreNodeModule';
import { docker } from './utils/docker-endpoint';

export async function systemPrune(): Promise<void> { //asdf
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    const terminal = ext.terminalProvider.createTerminal("docker system prune");
    const semver = getCoreNodeModule('semver');

    try {
        if (configOptions.get('promptOnSystemPrune', true)) { //asdf
            await ext.ui.showWarningMessage<vscode.MessageItem>('Remove all unused containers, volumes, networks and images (both dangling and unreferenced)?',
                { title: 'Yes' },
                { title: 'Cancel', isCloseAffordance: true }
            );
        }

        const info = await docker.getEngineInfo();

        // in docker 17.06.1 and higher you must specify the --volumes flag
        if (semver.gte(info.ServerVersion, '17.6.1', true)) {
            terminal.sendText(`docker system prune --volumes -f`);
        } else {
            terminal.sendText(`docker system prune -f`);
        }

        terminal.show();

    } catch (error) {
        throw new Error(`Unable to connect to Docker, is the Docker daemon running?  ${parseError(error).message}`); //asdf
    }
}
