/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from 'vscode-azureextensionui';
import { quickPickFile } from '../../utils/quickPickFile';
import { ScaffoldingWizardContext } from './ScaffoldingWizardContext';

export class ChooseArtifactStep extends AzureWizardPromptStep<ScaffoldingWizardContext> {
    public constructor(private readonly promptText: string, private readonly globPatterns: string[], private readonly noItemsMessage: string) {
        super();
    }

    public async prompt(wizardContext: ScaffoldingWizardContext): Promise<void> {
        const result = await quickPickFile(wizardContext.workspaceFolder, this.promptText, this.globPatterns, this.noItemsMessage);
        wizardContext.artifact = result.absoluteFilePath;
    }

    public shouldPrompt(wizardContext: ScaffoldingWizardContext): boolean {
        return !!wizardContext.artifact;
    }
}
