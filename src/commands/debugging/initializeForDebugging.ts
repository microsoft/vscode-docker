/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as os from 'os';
import { IActionContext } from 'vscode-azureextensionui';
import { quickPickOS, quickPickPlatform } from '../../configureWorkspace/configUtils';
import { DockerDebugScaffoldContext } from '../../debugging/DebugHelper';
import { dockerDebugScaffoldingProvider, NetCoreScaffoldingOptions } from '../../debugging/DockerDebugScaffoldingProvider';
import { DockerPlatform } from '../../debugging/DockerPlatformHelper';
import { quickPickDockerFileItem, quickPickProjectFileItem } from '../../utils/quickPickFile';
import { quickPickWorkspaceFolder } from '../../utils/quickPickWorkspaceFolder';
import { PythonScaffoldingOptions } from '../../debugging/python/PythonDebugHelper';

export async function initializeForDebugging(actionContext: IActionContext): Promise<void> {
    const folder = await quickPickWorkspaceFolder('To configure Docker debugging you must first open a folder or workspace in VS Code.');
    const platform = await quickPickPlatform(['Node.js', 'ASP.NET Core', '.NET Core Console', 'Python: Django', 'Python: Flask', 'Python: General']);

    let debugPlatform: DockerPlatform;
    switch (platform) {
        case '.NET Core Console':
        case 'ASP.NET Core':
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
            throw new Error('The selected platform is not yet supported for debugging.');
    }

    actionContext.telemetry.properties.platform = debugPlatform;

    const context: DockerDebugScaffoldContext = {
        folder: folder,
        platform: debugPlatform,
        actionContext: actionContext,
        dockerfile: (await quickPickDockerFileItem(actionContext, undefined, folder)).absoluteFilePath
    }

    switch (context.platform) {
        case 'netCore':
            const options: NetCoreScaffoldingOptions = {
                appProject: (await quickPickProjectFileItem(undefined, context.folder, 'No .NET Core project file (.csproj or .fsproj) could be found.')).absoluteFilePath,
                platformOS: os.platform() === 'win32' ? await quickPickOS() : 'Linux',
            }
            await dockerDebugScaffoldingProvider.initializeNetCoreForDebugging(context, options);
            break;
        case 'node':
            await dockerDebugScaffoldingProvider.initializeNodeForDebugging(context);
            break;
        case 'python':
            const pyOptions: PythonScaffoldingOptions = {
                projectType: platform == "Python: Django" ? "django" :
                             platform == "Python: Flask" ? "flask" : "general"
            }

            await dockerDebugScaffoldingProvider.initializePythonForDebugging(context, pyOptions);
            break;
        default:
    }
}
