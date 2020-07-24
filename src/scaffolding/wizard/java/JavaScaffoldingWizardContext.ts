/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, IWizardOptions } from 'vscode-azureextensionui';
import { ChoosePortsStep } from '../ChoosePortsStep';
import { ScaffoldingWizardContext } from '../ScaffoldingWizardContext';
import { JavaGatherInformationStep } from './JavaGatherInformationStep';

export interface JavaScaffoldingWizardContext extends ScaffoldingWizardContext {
    javaOutputPath?: string;
}

export function getJavaSubWizardOptions(wizardContext: ScaffoldingWizardContext): IWizardOptions<JavaScaffoldingWizardContext> {
    const promptSteps: AzureWizardPromptStep<JavaScaffoldingWizardContext>[] = [
        new ChoosePortsStep([3000]),
        new JavaGatherInformationStep(),
    ];

    return {
        promptSteps: promptSteps,
    };
}
