/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { callWithTelemetryAndErrorHandling, IActionContext } from 'vscode-azureextensionui';
import { quickPickOS, quickPickPlatform } from '../../configureWorkspace/configUtils';
import { InitializeDebugContext } from '../../debugging/DebugHelper';
import dockerDebugScaffoldingProvider, { NetCoreScaffoldingOptions } from '../../debugging/DockerDebugScaffoldingProvider';
import { DockerPlatform } from '../../debugging/DockerPlatformHelper';
import { quickPickProjectFileItem } from '../../utils/quick-pick-file';
import { quickPickWorkspaceFolder } from '../../utils/quickPickWorkspaceFolder';

export async function initializeForDebugging(): Promise<void> {
    const folder = await quickPickWorkspaceFolder('To configure Docker debugging you must first open a folder or workspace in VS Code.');
    const platform = await quickPickPlatform();

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
        async (actionContext: IActionContext) => {
            const context: InitializeDebugContext = {
                folder: folder,
                platform: debugPlatform,
                actionContext: actionContext,
            }

            switch (context.platform) {
                case 'netCore':
                    const options: NetCoreScaffoldingOptions = {
                        appProject: (await quickPickProjectFileItem(undefined, context.folder, 'You must choose a project file to set up for Docker debugging.')).absoluteFilePath,
                        platformOS: await quickPickOS(),
                    }
                    await dockerDebugScaffoldingProvider.initializeNetCoreForDebugging(context, options);
                    break;
                case 'node':
                    await dockerDebugScaffoldingProvider.initializeNodeForDebugging(context);
                    break;
                default:
            }
        });
}
