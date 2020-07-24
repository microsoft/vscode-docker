/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, IWizardOptions } from 'vscode-azureextensionui';
import { PythonTarget } from '../../../utils/pythonUtils';
import { ChoosePortsStep } from '../ChoosePortsStep';
import { ScaffoldDebuggingStep } from '../ScaffoldDebuggingStep';
import { ScaffoldFileStep } from '../ScaffoldFileStep';
import { ScaffoldingWizardContext } from '../ScaffoldingWizardContext';
import { ChoosePythonArtifactStep } from './ChoosePythonArtifactStep';
import { PythonGatherInformationStep } from './PythonGatherInformationStep';

export interface PythonScaffoldingWizardContext extends ScaffoldingWizardContext {
    pythonArtifact?: PythonTarget;
    pythonRequirements?: { [key: string]: string };
}

export function getPythonSubWizardOptions(wizardContext: ScaffoldingWizardContext): IWizardOptions<PythonScaffoldingWizardContext> {
    const promptSteps: AzureWizardPromptStep<PythonScaffoldingWizardContext>[] = [
        new ChoosePythonArtifactStep(),
    ];

    if (wizardContext.platform === 'Python: Django' && wizardContext.scaffoldType === 'all') {
        promptSteps.push(new ChoosePortsStep([8000]));
    } else if (wizardContext.platform === 'Python: Flask' && wizardContext.scaffoldType === 'all') {
        promptSteps.push(new ChoosePortsStep([5000]));
    }

    promptSteps.push(new PythonGatherInformationStep());

    return {
        promptSteps: promptSteps,
        executeSteps: [
            new ScaffoldFileStep('requirements.txt', 0),
            new ScaffoldDebuggingStep(),
        ],
    };
}
