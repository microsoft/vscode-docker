/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as os from 'os';
import { IActionContext } from 'vscode-azureextensionui';
import { ensureDotNetCoreDependencies } from '../../configureWorkspace/configureDotNetCore';
import { promptForLaunchFile } from '../../configureWorkspace/configurePython';
import { quickPickOS, quickPickPlatform } from '../../configureWorkspace/configUtils';
import { DockerDebugScaffoldContext } from '../../debugging/DebugHelper';
import { dockerDebugScaffoldingProvider, NetCoreScaffoldingOptions, PythonScaffoldingOptions } from '../../debugging/DockerDebugScaffoldingProvider';
import { DockerPlatform } from '../../debugging/DockerPlatformHelper';
import { localize } from '../../localize';
import { getPythonProjectType } from '../../utils/pythonUtils';
import { quickPickDockerFileItem, quickPickProjectFileItem } from '../../utils/quickPickFile';
import { quickPickWorkspaceFolder } from '../../utils/quickPickWorkspaceFolder';

export async function initializeForDebugging(actionContext: IActionContext): Promise<void> {
    const folder = await quickPickWorkspaceFolder(localize('vscode-docker.commands.debugging.initialize.workspaceFolder', 'To configure Docker debugging you must first open a folder or workspace in VS Code.'));
    const platform = await quickPickPlatform(['Node.js', '.NET: ASP.NET Core', '.NET: Core Console', 'Python: Django', 'Python: Flask', 'Python: General']);

    let debugPlatform: DockerPlatform;
    switch (platform) {
        case '.NET: Core Console':
        case '.NET: ASP.NET Core':
            debugPlatform = 'netCore';
            break;
        case 'Node.js':
            debugPlatform = 'node';
            break;
        case 'Python: Django':
        case 'Python: Flask':
        case 'Python: General':
            debugPlatform = 'python';
            break;
        default:
            throw new Error(localize('vscode-docker.commands.debugging.initialize.platformNotSupported', 'The selected platform is not yet supported for debugging.'));
    }

    actionContext.telemetry.properties.dockerPlatform = debugPlatform;
    if (debugPlatform === 'netCore') {
        ensureDotNetCoreDependencies(folder, actionContext);
    }

    const context: DockerDebugScaffoldContext = {
        folder: folder,
        platform: debugPlatform,
        actionContext: actionContext,
        dockerfile: (await quickPickDockerFileItem(actionContext, undefined, folder)).absoluteFilePath
    }

    switch (context.platform) {
        case 'netCore':
            const options: NetCoreScaffoldingOptions = {
                appProject: (await quickPickProjectFileItem(undefined, context.folder, localize('vscode-docker.commands.debugging.initialize.noCsproj', 'No .NET Core project file (.csproj or .fsproj) could be found.'))).absoluteFilePath,
                platformOS: os.platform() === 'win32' ? await quickPickOS() : 'Linux',
            }
            await dockerDebugScaffoldingProvider.initializeNetCoreForDebugging(context, options);
            break;
        case 'node':
            await dockerDebugScaffoldingProvider.initializeNodeForDebugging(context);
            break;
        case 'python':
            const pythonProjectType = getPythonProjectType(platform);

            const pyOptions: PythonScaffoldingOptions = {
                projectType: pythonProjectType,
                target: await promptForLaunchFile(pythonProjectType)
            }

            await dockerDebugScaffoldingProvider.initializePythonForDebugging(context, pyOptions);
            break;
        default:
    }
}
