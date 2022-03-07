/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, IWizardOptions } from '@microsoft/vscode-azext-utils';
import { CSPROJ_GLOB_PATTERN, FSPROJ_GLOB_PATTERN } from '../../../constants';
import { localize } from '../../../localize';
import { PlatformOS } from '../../../utils/platform';
import { ChooseArtifactStep } from '../ChooseArtifactStep';
import { ChoosePortsStep } from '../ChoosePortsStep';
import { ScaffoldDebuggingStep } from '../ScaffoldDebuggingStep';
import { ScaffoldingWizardContext } from '../ScaffoldingWizardContext';
import { NetCoreChooseOsStep } from './NetCoreChooseOsStep';
import { NetCoreGatherInformationStep } from './NetCoreGatherInformationStep';
import { NetCoreTryGetRandomPortStep } from './NetCoreTryGetRandomPortStep';

const chooseProjectFile = localize('vscode-docker.scaffold.platforms.netCore.chooseProject', 'Choose a project file');
const netCoreGlobPatterns = [CSPROJ_GLOB_PATTERN, FSPROJ_GLOB_PATTERN];
const noProjectFile = localize('vscode-docker.scaffold.platforms.netCore.noProject', 'No C# or F# project files were found in the workspace.');

export interface NetCoreScaffoldingWizardContext extends ScaffoldingWizardContext {
    netCoreAssemblyName?: string;
    netCoreRuntimeBaseImage?: string;
    netCoreSdkBaseImage?: string;
    netCorePlatformOS?: PlatformOS;
}

export function getNetCoreSubWizardOptions(wizardContext: ScaffoldingWizardContext): IWizardOptions<NetCoreScaffoldingWizardContext> {
    const promptSteps: AzureWizardPromptStep<NetCoreScaffoldingWizardContext>[] = [
        new ChooseArtifactStep(chooseProjectFile, netCoreGlobPatterns, noProjectFile),
        new NetCoreChooseOsStep(),
    ];

    if (wizardContext.platform === '.NET: ASP.NET Core' && (wizardContext.scaffoldType === 'all' || wizardContext.scaffoldType === 'compose')) {
        promptSteps.push(new NetCoreTryGetRandomPortStep());
        promptSteps.push(new ChoosePortsStep([5000]));
    }

    promptSteps.push(new NetCoreGatherInformationStep());

    return {
        promptSteps: promptSteps,
        executeSteps: [
            new ScaffoldDebuggingStep(),
        ],
    };
}
