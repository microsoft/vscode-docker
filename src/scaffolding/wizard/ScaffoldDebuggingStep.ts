/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Progress } from 'vscode';
import { AzureWizardExecuteStep } from 'vscode-azureextensionui';
import { DockerDebugScaffoldContext } from '../../debugging/DebugHelper';
import { dockerDebugScaffoldingProvider, NetCoreScaffoldingOptions, PythonScaffoldingOptions } from '../../debugging/DockerDebugScaffoldingProvider';
import { localize } from '../../localize';
import { PythonProjectType } from '../../utils/pythonUtils';
import { unresolveWorkspaceFolder } from '../../utils/resolveVariables';
import { PythonScaffoldingWizardContext } from './ChoosePythonArtifactStep';
import { ScaffoldingWizardContext } from './ScaffoldingWizardContext';

export class ScaffoldDebuggingStep extends AzureWizardExecuteStep<ScaffoldingWizardContext> {
    public readonly priority: number = 200;

    public async execute(wizardContext: ScaffoldingWizardContext, progress: Progress<{ message?: string; increment?: number; }>): Promise<void> {
        const scaffoldContext: DockerDebugScaffoldContext = {
            folder: wizardContext.workspaceFolder,
            actionContext: wizardContext,
            dockerfile: 'todo',
            ports: wizardContext.ports,
        };

        switch (wizardContext.platform) {
            case 'Node.js':
                scaffoldContext.platform = 'node';
                await dockerDebugScaffoldingProvider.initializeNodeForDebugging(scaffoldContext);
                break;

            case '.NET: ASP.NET Core':
            case '.NET: Core Console':
                scaffoldContext.platform = 'netCore';
                const netCoreOptions: NetCoreScaffoldingOptions = {
                    appProject: unresolveWorkspaceFolder(wizardContext.artifact, wizardContext.workspaceFolder),
                    platformOS: wizardContext.platformOS,
                };
                await dockerDebugScaffoldingProvider.initializeNetCoreForDebugging(scaffoldContext, netCoreOptions);
                break;

            case 'Python: Django':
            case 'Python: Flask':
            case 'Python: General':
                scaffoldContext.platform = 'python';
                const pythonProjectType: PythonProjectType =
                    wizardContext.platform === 'Python: Django' ? 'django' :
                        wizardContext.platform === 'Python: Flask' ? 'flask' :
                            'general';
                const pythonOptions: PythonScaffoldingOptions = {
                    projectType: pythonProjectType,
                    target: (wizardContext as PythonScaffoldingWizardContext).pythonArtifact,
                };
                await dockerDebugScaffoldingProvider.initializePythonForDebugging(scaffoldContext, pythonOptions);
                break;

            default:
                throw new Error(localize('vscode-docker.scaffold.scaffoldDebuggingStep.invalidPlatform', 'Invalid platform for debug config scaffolding.'));
        }
    }

    public shouldExecute(wizardContext: ScaffoldingWizardContext): boolean {
        // This should always execute if this step is included
        return true;
    }
}
