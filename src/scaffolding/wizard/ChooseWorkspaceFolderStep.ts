/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from 'vscode-azureextensionui';
import { localize } from '../../localize';
import { quickPickWorkspaceFolder } from '../../utils/quickPickWorkspaceFolder';
import { ScaffoldingWizardContext } from './ScaffoldingWizardContext';

export class ChooseWorkspaceFolderStep extends AzureWizardPromptStep<ScaffoldingWizardContext> {
    public async prompt(wizardContext: ScaffoldingWizardContext): Promise<void> {
        wizardContext.workspaceFolder = await quickPickWorkspaceFolder(localize('vscode-docker.scaffold.chooseWorkspaceFolderStep.noWorkspaceFolders', 'No workspace folders are open. Please open a workspace or workspace folder.'));
    }

    public shouldPrompt(wizardContext: ScaffoldingWizardContext): boolean {
        return !wizardContext.workspaceFolder;
    }
}
