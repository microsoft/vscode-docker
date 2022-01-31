/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep, UserCancelledError } from '@microsoft/vscode-azext-utils';
import { localize } from '../localize';
import { copyWizardContext } from './copyWizardContext';
import { ChoosePlatformStep } from './wizard/ChoosePlatformStep';
import { ChooseWorkspaceFolderStep } from './wizard/ChooseWorkspaceFolderStep';
import { ScaffoldFileStep } from './wizard/ScaffoldFileStep';
import { ScaffoldingWizardContext } from './wizard/ScaffoldingWizardContext';
import { VerifyDockerfileStep } from './wizard/VerifyDockerfileStep';

export async function scaffoldCompose(wizardContext: Partial<ScaffoldingWizardContext>, apiInput?: ScaffoldingWizardContext): Promise<void> {
    if (!vscode.workspace.isTrusted) {
        throw new UserCancelledError('enforceTrust');
    }

    copyWizardContext(wizardContext, apiInput);
    wizardContext.scaffoldType = 'compose';
    wizardContext.scaffoldCompose = true;

    const promptSteps: AzureWizardPromptStep<ScaffoldingWizardContext>[] = [
        new ChooseWorkspaceFolderStep(),
        new ChoosePlatformStep(),
        new VerifyDockerfileStep(),
    ];

    const executeSteps: AzureWizardExecuteStep<ScaffoldingWizardContext>[] = [
        new ScaffoldFileStep('docker-compose.yml', 'ask', 300),
        new ScaffoldFileStep('docker-compose.debug.yml', 'ask', 400),
    ];

    const wizard = new AzureWizard<ScaffoldingWizardContext>(wizardContext as ScaffoldingWizardContext, {
        promptSteps: promptSteps,
        executeSteps: executeSteps,
        title: localize('vscode-docker.scaffold.addDockerFiles', 'Add Docker Compose Files'),
    });

    await wizard.prompt();
    await wizard.execute();
}
