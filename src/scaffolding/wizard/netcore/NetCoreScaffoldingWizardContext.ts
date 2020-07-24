/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, IWizardOptions } from 'vscode-azureextensionui';
import { CSPROJ_GLOB_PATTERN, FSPROJ_GLOB_PATTERN } from '../../../constants';
import { localize } from '../../../localize';
import { ChooseArtifactStep } from '../ChooseArtifactStep';
import { ChooseOsStep } from '../ChooseOsStep';
import { ChoosePortsStep } from '../ChoosePortsStep';
import { ScaffoldingWizardContext } from '../ScaffoldingWizardContext';
import { NetCoreGatherInformationStep } from './NetCoreGatherInformationStep';

const chooseProjectFile = localize('vscode-docker.scaffold.platforms.netCore.chooseProject', 'Choose a project file');
const netCoreGlobPatterns = [CSPROJ_GLOB_PATTERN, FSPROJ_GLOB_PATTERN];
const noProjectFile = localize('vscode-docker.scaffold.platforms.netCore.noProject', 'No C# or F# project files were found in the workspace.');

export interface NetCoreScaffoldingWizardContext extends ScaffoldingWizardContext {
    netCoreOutputPath?: string;
    netCoreSdkBaseImage?: string;
}

export function getNetCoreSubwizardOptions(wizardContext: ScaffoldingWizardContext): IWizardOptions<NetCoreScaffoldingWizardContext> {
    const promptSteps: AzureWizardPromptStep<NetCoreScaffoldingWizardContext>[] = [
        new ChooseArtifactStep(chooseProjectFile, netCoreGlobPatterns, noProjectFile),
        new ChooseOsStep(),
    ];

    if (wizardContext.platform === '.NET: ASP.NET Core') {
        promptSteps.push(new ChoosePortsStep([80, 443]));
    }

    promptSteps.push(new NetCoreGatherInformationStep());

    return {
        promptSteps: promptSteps,
        executeSteps: [
            // TODO
        ],
    };
}
