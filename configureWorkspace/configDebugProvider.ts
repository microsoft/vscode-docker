/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
export class DockerDebugConfigProvider implements vscode.DebugConfigurationProvider {

    public provideDebugConfigurations(folder: vscode.WorkspaceFolder | undefined, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration[]> {

        const config: vscode.DebugConfiguration = {
            name: 'Docker: Attach to Node',
            type: 'node',
            request: 'attach',
            port: 9229,
            address: 'localhost',
            localRoot: '\${workspaceFolder}',
            remoteRoot: '/usr/src/app',
            protocol: 'inspector'
        };

        return [config];

    }

}
