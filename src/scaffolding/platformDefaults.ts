/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardExecuteStep, AzureWizardPromptStep } from 'vscode-azureextensionui';
import { Platform } from '../utils/platform';
import { ChooseArtifactStep } from './wizard/ChooseArtifactStep';
import { ChooseOsStep } from './wizard/ChooseOsStep';
import { ChoosePortsStep } from './wizard/ChoosePortsStep';
import { ScaffoldDebuggingStep } from './wizard/ScaffoldDebuggingStep';
import { ScaffoldingWizardContext } from './wizard/ScaffoldingWizardContext';

export function addPlatformSpecificPromptSteps(platform: Platform, promptSteps: AzureWizardPromptStep<ScaffoldingWizardContext>[]): void {
    switch (platform) {
        case 'Node.js':
            promptSteps.push(new ChooseArtifactStep('todo', ['todo'], 'todo'));
            promptSteps.push(new ChoosePortsStep([3000]));
            break;
        case '.NET: ASP.NET Core':
            promptSteps.push(new ChooseArtifactStep('todo', ['todo'], 'todo'));
            promptSteps.push(new ChooseOsStep());
            promptSteps.push(new ChoosePortsStep([80, 443]));
            break;
        case '.NET: Core Console':
            promptSteps.push(new ChooseArtifactStep('todo', ['todo'], 'todo'));
            promptSteps.push(new ChooseOsStep());
            break;
        case 'Python: Django':
            promptSteps.push(new ChooseArtifactStep('todo', ['todo'], 'todo'));
            promptSteps.push(new ChoosePortsStep([8000]));
            break;
        case 'Python: Flask':
            promptSteps.push(new ChooseArtifactStep('todo', ['todo'], 'todo'));
            promptSteps.push(new ChoosePortsStep([5000]));
            break;
        case 'Python: General':
            promptSteps.push(new ChooseArtifactStep('todo', ['todo'], 'todo'));
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
        case 'Python: Django':
        case 'Python: Flask':
        case 'Python: General':
            executeSteps.push(new ScaffoldDebuggingStep());
            break;

        default:
    }
}
