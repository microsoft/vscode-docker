/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { ScaffoldingWizardContext } from './ScaffoldingWizardContext';
import { TelemetryPromptStep } from './TelemetryPromptStep';

export class VerifyDockerfileStep<TWizardContext extends ScaffoldingWizardContext> extends TelemetryPromptStep<TWizardContext> {
    public async prompt(wizardContext: TWizardContext): Promise<void> {
        if (!(await fse.pathExists(path.join(wizardContext.dockerfileDirectory, 'Dockerfile')))) {
            wizardContext.errorHandling.suppressReportIssue = true;
            wizardContext.errorHandling.buttons = [
                {
                    callback: async () => {
                        void vscode.commands.executeCommand('vscode-docker.configure', wizardContext); // They have already answered several questions, so we can copy in the current wizard context to save time
                    },
                    title: vscode.l10n.t('Add Docker Files'),
                }
            ];

            throw new Error(vscode.l10n.t('No Dockerfile is present in the workspace. Please add Docker files before adding Compose files.'));
        }
    }

    public shouldPrompt(wizardContext: TWizardContext): boolean {
        return true;
    }
}
