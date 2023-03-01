/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ScaffoldingWizardContext } from './ScaffoldingWizardContext';
import { TelemetryPromptStep } from './TelemetryPromptStep';

export class ChooseComposeStep extends TelemetryPromptStep<ScaffoldingWizardContext> {
    public async prompt(wizardContext: ScaffoldingWizardContext): Promise<void> {
        const opt: vscode.QuickPickOptions = {
            placeHolder: vscode.l10n.t('Include optional Docker Compose files?')
        };

        const response = await wizardContext.ui.showQuickPick(
            [
                { label: 'No', data: false },
                { label: 'Yes', data: true }
            ],
            opt
        );

        wizardContext.scaffoldCompose = response.data;
    }

    public shouldPrompt(wizardContext: ScaffoldingWizardContext): boolean {
        return wizardContext.scaffoldCompose === undefined;
    }

    protected setTelemetry(wizardContext: ScaffoldingWizardContext): void {
        wizardContext.telemetry.properties.orchestration = wizardContext.scaffoldCompose ? 'docker-compose' : 'single';
    }
}
