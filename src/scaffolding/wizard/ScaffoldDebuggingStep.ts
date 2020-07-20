/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Progress } from 'vscode';
import { AzureWizardExecuteStep } from 'vscode-azureextensionui';
import { ScaffoldingWizardContext } from './ScaffoldingWizardContext';

export class ScaffoldDebuggingStep extends AzureWizardExecuteStep<ScaffoldingWizardContext> {
    public priority: number;

    public async execute(wizardContext: ScaffoldingWizardContext, progress: Progress<{ message?: string; increment?: number; }>): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public shouldExecute(wizardContext: ScaffoldingWizardContext): boolean {
        throw new Error("Method not implemented.");
    }
}
