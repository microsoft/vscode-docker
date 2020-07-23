/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PythonScaffoldingWizardContext } from './ChoosePythonArtifactStep';
import { ScaffoldFileStep } from './ScaffoldFileStep';
import { ScaffoldedFileType } from './ScaffoldingWizardContext';

type PythonScaffoldedFileType = ScaffoldedFileType | 'requirements.txt';

export class PythonScaffoldFileStep extends ScaffoldFileStep<PythonScaffoldingWizardContext, PythonScaffoldedFileType> {
    public constructor(fileType: PythonScaffoldedFileType, priority: number) {
        super(fileType, priority);
    }

    public async execute(wizardContext: PythonScaffoldingWizardContext, progress: never): Promise<void> {
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

        return super.execute(wizardContext, progress);
    }

    public shouldExecute(wizardContext: PythonScaffoldingWizardContext): boolean {
        return wizardContext.platform === 'Python: Django' || wizardContext.platform === 'Python: Flask';
    }
}
