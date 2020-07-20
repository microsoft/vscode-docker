/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Progress } from 'vscode';
import { AzureWizardExecuteStep } from 'vscode-azureextensionui';
import { ScaffoldingWizardContext } from './ScaffoldingWizardContext';

export abstract class ScaffoldFileStepBase extends AzureWizardExecuteStep<ScaffoldingWizardContext> {
    public constructor(public readonly fileType: '.dockerignore' | 'Dockerfile' | 'docker-compose.yml' | 'docker-compose.debug.yml') {
        super();
    }

    public async execute(wizardContext: ScaffoldingWizardContext, progress: Progress<{ message?: string; increment?: number; }>): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
