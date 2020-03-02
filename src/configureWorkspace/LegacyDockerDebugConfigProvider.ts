/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import { ext } from '../extensionVariables';
import { localize } from '../localize';

export class LegacyDockerDebugConfigProvider implements vscode.DebugConfigurationProvider {

    public async provideDebugConfigurations(folder: vscode.WorkspaceFolder | undefined, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration[]> {
        const remoteRoot = await ext.ui.showInputBox({ value: '/usr/src/app', prompt: localize('vscode-docker.legacyDebug.remoteRoot', 'Please enter your Docker remote root') });
        return [{
            name: 'Docker: Attach to Node',
            type: 'node',
            request: 'attach',
            remoteRoot
        }];
    }
}
