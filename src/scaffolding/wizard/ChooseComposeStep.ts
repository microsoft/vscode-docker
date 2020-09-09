/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ScaffoldingWizardContext } from './ScaffoldingWizardContext';
import { TelemetryPromptStep } from './TelemetryPromptStep';

export class ChooseComposeStep extends TelemetryPromptStep<ScaffoldingWizardContext> {
    public async prompt(wizardContext: ScaffoldingWizardContext): Promise<void> {
        const opt: vscode.QuickPickOptions = {
            placeHolder: localize('vscode-docker.scaffold.chooseComposeStep.includeCompose', 'Include optional Docker Compose files?')
        };

        const response = await ext.ui.showQuickPick(
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
