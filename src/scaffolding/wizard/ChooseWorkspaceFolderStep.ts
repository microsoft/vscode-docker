/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../localize';
import { quickPickWorkspaceFolder } from '../../utils/quickPickWorkspaceFolder';
import { ScaffoldingWizardContext } from './ScaffoldingWizardContext';
import { TelemetryPromptStep } from './TelemetryPromptStep';

export class ChooseWorkspaceFolderStep extends TelemetryPromptStep<ScaffoldingWizardContext> {
    public async prompt(wizardContext: ScaffoldingWizardContext): Promise<void> {
        try {
            wizardContext.workspaceFolder = await quickPickWorkspaceFolder(localize('vscode-docker.scaffold.chooseWorkspaceFolderStep.noWorkspaceFolders', 'No workspace folders are open. Please open a workspace or workspace folder.'));
        } catch (err) {
            // This will only fail if the user cancels or has no folder open. To prevent a common class of non-bugs from being filed, suppress report issue here.
            wizardContext.errorHandling.suppressReportIssue = true;
            throw err;
        }
    }

    public shouldPrompt(wizardContext: ScaffoldingWizardContext): boolean {
        return !wizardContext.workspaceFolder;
    }
}
