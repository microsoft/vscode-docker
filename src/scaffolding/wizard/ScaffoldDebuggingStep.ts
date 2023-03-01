/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardExecuteStep } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import { l10n, Progress } from 'vscode';
import { DockerDebugScaffoldContext } from '../../debugging/DebugHelper';
import { dockerDebugScaffoldingProvider } from '../../debugging/DockerDebugScaffoldingProvider';
import { unresolveWorkspaceFolder } from '../../utils/resolveVariables';
import { NetCoreScaffoldingWizardContext } from './netCore/NetCoreScaffoldingWizardContext';
import { PythonScaffoldingWizardContext } from './python/PythonScaffoldingWizardContext';
import { ScaffoldingWizardContext } from './ScaffoldingWizardContext';

export class ScaffoldDebuggingStep extends AzureWizardExecuteStep<ScaffoldingWizardContext> {
    public readonly priority: number = 1000;

    public async execute(wizardContext: ScaffoldingWizardContext, progress: Progress<{ message?: string; increment?: number; }>): Promise<void> {
        progress.report({ message: l10n.t('Adding debug configuration and tasks...') });

        const scaffoldContext: DockerDebugScaffoldContext = {
            folder: wizardContext.workspaceFolder,
            actionContext: wizardContext,
            dockerfile: path.join(wizardContext.dockerfileDirectory, 'Dockerfile'),
            ports: wizardContext.ports,
        };

        switch (wizardContext.platform) {
            case 'Node.js':
                scaffoldContext.platform = 'node';
                await dockerDebugScaffoldingProvider.initializeNodeForDebugging(
                    scaffoldContext,
                    {
                        package: wizardContext.artifact,
                    }
                );
                break;

            case '.NET: ASP.NET Core':
            case '.NET: Console':
                scaffoldContext.platform = 'netCore';
                await dockerDebugScaffoldingProvider.initializeNetCoreForDebugging(
                    scaffoldContext,
                    {
                        appProject: unresolveWorkspaceFolder(wizardContext.artifact, wizardContext.workspaceFolder),
                        platformOS: (wizardContext as NetCoreScaffoldingWizardContext).netCorePlatformOS,
                    }
                );
                break;

            case 'Python: Django':
            case 'Python: FastAPI':
            case 'Python: Flask':
            case 'Python: General':
                scaffoldContext.platform = 'python';
                await dockerDebugScaffoldingProvider.initializePythonForDebugging(
                    scaffoldContext,
                    {
                        projectType: (wizardContext as PythonScaffoldingWizardContext).pythonProjectType,
                        target: (wizardContext as PythonScaffoldingWizardContext).pythonArtifact,
                    }
                );
                break;

            default:
                throw new Error(l10n.t('Invalid platform for debug config scaffolding.'));
        }
    }

    public shouldExecute(wizardContext: ScaffoldingWizardContext): boolean {
        switch (wizardContext.platform) {
            case 'Node.js':
            case '.NET: ASP.NET Core':
            case '.NET: Console':
            case 'Python: Django':
            case 'Python: FastAPI':
            case 'Python: Flask':
            case 'Python: General':
                return wizardContext.scaffoldType === 'all' || wizardContext.scaffoldType === 'debugging';

            default:
                return false;
        }
    }
}
