/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { resolveFilesOfPattern } from '../../utils/quickPickFile';
import { ScaffoldingWizardContext } from './ScaffoldingWizardContext';
import { TelemetryPromptStep } from './TelemetryPromptStep';

export class ChooseArtifactStep<TWizardContext extends ScaffoldingWizardContext> extends TelemetryPromptStep<TWizardContext> {
    public constructor(protected readonly promptText: string, protected readonly globPatterns: string[], protected readonly noItemsMessage: string) {
        super();
    }

    public async prompt(wizardContext: TWizardContext): Promise<void> {
        const items = await resolveFilesOfPattern(wizardContext.workspaceFolder, this.globPatterns);

        if (!items) {
            wizardContext.errorHandling.suppressReportIssue = true;
            throw new Error(this.noItemsMessage);
        } else if (items.length === 1) {
            wizardContext.artifact = items[0].absoluteFilePath;
        } else {
            const item = await wizardContext.ui.showQuickPick(items, { placeHolder: this.promptText });
            wizardContext.artifact = item.absoluteFilePath;
        }
    }

    public shouldPrompt(wizardContext: TWizardContext): boolean {
        return !wizardContext.artifact;
    }
}
