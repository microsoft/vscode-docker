/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from 'vscode-azureextensionui';
import { ScaffoldingWizardContext } from './ScaffoldingWizardContext';

export class GatherInformationStep<TWizardContext extends ScaffoldingWizardContext> extends AzureWizardPromptStep<TWizardContext> {
    public async prompt(wizardContext: TWizardContext): Promise<void> {
        // Calculate more info
    }

    public shouldPrompt(wizardContext: TWizardContext): boolean {
        // TODO
        return true;
    }
}
