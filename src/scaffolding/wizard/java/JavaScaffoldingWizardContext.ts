/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, IWizardOptions } from '@microsoft/vscode-azext-utils';
import { ChoosePortsStep } from '../ChoosePortsStep';
import { ScaffoldingWizardContext } from '../ScaffoldingWizardContext';
import { ChooseJavaArtifactStep } from './ChooseJavaArtifactStep';
import { JavaGatherInformationStep } from './JavaGatherInformationStep';

export interface JavaScaffoldingWizardContext extends ScaffoldingWizardContext {
    relativeJavaOutputPath?: string;
}

export function getJavaSubWizardOptions(wizardContext: ScaffoldingWizardContext): IWizardOptions<JavaScaffoldingWizardContext> {
    const promptSteps: AzureWizardPromptStep<JavaScaffoldingWizardContext>[] = [
        new ChooseJavaArtifactStep(),
        new ChoosePortsStep([3000]),
        new JavaGatherInformationStep(),
    ];

    return {
        promptSteps: promptSteps,
    };
}
