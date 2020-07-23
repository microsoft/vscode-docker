/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardExecuteStep, AzureWizardPromptStep } from 'vscode-azureextensionui';
import { CSPROJ_GLOB_PATTERN, FSPROJ_GLOB_PATTERN } from '../constants';
import { localize } from '../localize';
import { Platform } from '../utils/platform';
import { ChooseArtifactStep } from './wizard/ChooseArtifactStep';
import { ChooseOsStep } from './wizard/ChooseOsStep';
import { ChoosePortsStep } from './wizard/ChoosePortsStep';
import { ChoosePythonArtifactStep } from './wizard/ChoosePythonArtifactStep';
import { PythonScaffoldFileStep } from './wizard/PythonScaffoldFileStep';
import { ScaffoldDebuggingStep } from './wizard/ScaffoldDebuggingStep';
import { ScaffoldingWizardContext } from './wizard/ScaffoldingWizardContext';

const choosePackageFile = localize('vscode-docker.scaffold.platforms.node.choosePackage', 'Choose a package.json file');
const nodeGlobPatterns = ['**/{[Pp][Aa][Cc][Kk][Aa][Gg][Ee].[Jj][Ss][Oo][Nn]}'];
const noPackageFile = localize('vscode-docker.scaffold.platforms.node.noPackage', 'No package.json files were found in the workspace.');

const chooseProjectFile = localize('vscode-docker.scaffold.platforms.netCore.chooseProject', 'Choose a project file');
const netCoreGlobPatterns = [CSPROJ_GLOB_PATTERN, FSPROJ_GLOB_PATTERN];
const noProjectFile = localize('vscode-docker.scaffold.platforms.netCore.noProject', 'No C# or F# project files were found in the workspace.');

export function addPlatformSpecificPromptSteps(platform: Platform, promptSteps: AzureWizardPromptStep<ScaffoldingWizardContext>[]): void {
    switch (platform) {
        case 'Node.js':
            promptSteps.push(new ChooseArtifactStep(choosePackageFile, nodeGlobPatterns, noPackageFile));
            promptSteps.push(new ChoosePortsStep([3000]));
            break;
        case '.NET: ASP.NET Core':
            promptSteps.push(new ChooseArtifactStep(chooseProjectFile, netCoreGlobPatterns, noProjectFile));
            promptSteps.push(new ChooseOsStep());
            promptSteps.push(new ChoosePortsStep([80, 443]));
            break;
        case '.NET: Core Console':
            promptSteps.push(new ChooseArtifactStep(chooseProjectFile, netCoreGlobPatterns, noProjectFile));
            promptSteps.push(new ChooseOsStep());
            break;
        case 'Python: Django':
            promptSteps.push(new ChoosePythonArtifactStep());
            promptSteps.push(new ChoosePortsStep([8000]));
            break;
        case 'Python: Flask':
            promptSteps.push(new ChoosePythonArtifactStep());
            promptSteps.push(new ChoosePortsStep([5000]));
            break;
        case 'Python: General':
            promptSteps.push(new ChoosePythonArtifactStep());
            break;
        case 'Java':
        case 'Go':
        case 'Ruby':
            promptSteps.push(new ChoosePortsStep([3000]));
            break;

        case 'C++':
        case 'Other':
        default:
    }
}

export function addPlatformSpecificExecuteSteps(platform: Platform, executeSteps: AzureWizardExecuteStep<ScaffoldingWizardContext>[]): void {
    switch (platform) {
        case 'Node.js':
        case '.NET: ASP.NET Core':
        case '.NET: Core Console':
            executeSteps.push(new ScaffoldDebuggingStep());
            break;
        case 'Python: Django':
        case 'Python: Flask':
        case 'Python: General':
            executeSteps.push(new PythonScaffoldFileStep('requirements.txt', 1100));
            executeSteps.push(new ScaffoldDebuggingStep());
            break;

        default:
    }
}
