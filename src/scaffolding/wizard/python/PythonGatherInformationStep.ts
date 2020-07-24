/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { GatherInformationStep } from '../GatherInformationStep';
import { PythonScaffoldingWizardContext } from './PythonScaffoldingWizardContext';

export class PythonGatherInformationStep extends GatherInformationStep<PythonScaffoldingWizardContext> {
    public async prompt(wizardContext: PythonScaffoldingWizardContext): Promise<void> {
        if (wizardContext.platform === 'Python: Django') {
            wizardContext.pythonRequirements = {
                django: '3.0.8',
                gunicorn: '20.0.4',
            };
        } else if (wizardContext.platform === 'Python: Flask') {
            wizardContext.pythonRequirements = {
                flask: '1.1.2',
                gunicorn: '20.0.4',
            };
        }
    }

    public shouldPrompt(wizardContext: PythonScaffoldingWizardContext): boolean {
        return !wizardContext.pythonRequirements;
    }
}
