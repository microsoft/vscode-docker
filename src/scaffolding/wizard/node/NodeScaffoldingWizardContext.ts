/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, IWizardOptions } from '@microsoft/vscode-azext-utils';
import { l10n } from 'vscode';
import { ChooseArtifactStep } from '../ChooseArtifactStep';
import { ChoosePortsStep } from '../ChoosePortsStep';
import { ScaffoldDebuggingStep } from '../ScaffoldDebuggingStep';
import { ScaffoldingWizardContext } from '../ScaffoldingWizardContext';
import { NodeGatherInformationStep } from './NodeGatherInformationStep';

const choosePackageFile = l10n.t('Choose a package.json file');
const nodeGlobPatterns = ['**/{[Pp][Aa][Cc][Kk][Aa][Gg][Ee].[Jj][Ss][Oo][Nn]}'];
const noPackageFile = l10n.t('No package.json files were found in the workspace.');

export interface NodeScaffoldingWizardContext extends ScaffoldingWizardContext {
    nodeCmdParts?: string[];
    nodeDebugCmdParts?: string[];
}

export function getNodeSubWizardOptions(wizardContext: ScaffoldingWizardContext): IWizardOptions<NodeScaffoldingWizardContext> {
    const promptSteps: AzureWizardPromptStep<NodeScaffoldingWizardContext>[] = [
        new ChooseArtifactStep(choosePackageFile, nodeGlobPatterns, noPackageFile),
    ];

    if (wizardContext.scaffoldType === 'all' || wizardContext.scaffoldType === 'compose') {
        promptSteps.push(new ChoosePortsStep([3000]));
    }

    promptSteps.push(new NodeGatherInformationStep());

    return {
        promptSteps: promptSteps,
        executeSteps: [
            new ScaffoldDebuggingStep(),
        ],
    };
}
