/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as semver from 'semver';
import vscode = require('vscode');
import { IActionContext } from 'vscode-azureextensionui';
import { throwDockerConnectionError } from '../explorer/utils/dockerConnectionError';
import { ext } from '../extensionVariables';
import { docker } from './utils/docker-endpoint';

export async function systemPrune(context: IActionContext): Promise<void> {
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    const terminal = ext.terminalProvider.createTerminal("docker system prune");

    try {
        if (configOptions.get('promptOnSystemPrune', true)) {
            let res = await vscode.window.showWarningMessage<vscode.MessageItem>(
                'Remove all unused containers, volumes, networks and images (both dangling and unreferenced)?',
                { title: 'Yes' },
                { title: 'Cancel', isCloseAffordance: true }
            );

            if (!res || res.isCloseAffordance) {
                return;
            }
        }

        // EngineInfo in dockerode is incomplete
        const info = <Docker.EngineInfo & { ServerVersion: string }>await docker.getEngineInfo();

        // in docker 17.06.1 and higher you must specify the --volumes flag
        if (semver.gte(info.ServerVersion, '17.6.1', true)) {
            terminal.sendText(`docker system prune --volumes -f`);
        } else {
            terminal.sendText(`docker system prune -f`);
        }

        terminal.show();

    } catch (error) {
        throwDockerConnectionError(context, error);
    }
}
