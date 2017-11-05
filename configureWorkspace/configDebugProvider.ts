/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
export class DockerDebugConfigProvider implements vscode.DebugConfigurationProvider {

    provideDebugConfigurations(folder: vscode.WorkspaceFolder | undefined, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration[]> {

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

