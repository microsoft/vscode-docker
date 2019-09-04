/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { WorkspaceFolder } from 'vscode';
import { callWithTelemetryAndErrorHandling } from 'vscode-azureextensionui';
import { quickPickOS, quickPickPlatform } from '../../configureWorkspace/configUtils';
import dockerDebugScaffoldingProvider from '../../debugging/DockerDebugScaffoldingProvider';
import { DockerPlatform } from '../../debugging/DockerPlatformHelper';
import { Platform } from '../../utils/platform';
import { quickPickWorkspaceFolder } from '../../utils/quickPickWorkspaceFolder';

export async function initializeForDebugging(folder?: WorkspaceFolder, platform?: Platform): Promise<void> {
    folder = folder || await quickPickWorkspaceFolder('To configure Docker debugging you must first open a folder or workspace in VS Code.');
    platform = platform || await quickPickPlatform();

    let debugPlatform: DockerPlatform;
    switch (platform) {
        case '.NET Core Console':
        case 'ASP.NET Core':
            debugPlatform = 'netCore';
            break;
        case 'Node.js':
            debugPlatform = 'node';
            break;
        default:
    }

    return await callWithTelemetryAndErrorHandling(
        `docker-debug-initialize/${debugPlatform || 'unknown'}`,
        async () => {
            switch (debugPlatform) {
                case 'netCore':
                    const platformOS = await quickPickOS();
                    await dockerDebugScaffoldingProvider.initializeNetCoreForDebugging(folder, { platformOS });
                    break;
                case 'node':
                    await dockerDebugScaffoldingProvider.initializeNodeForDebugging(folder);
                    break;
                default:
            }
        });
}
