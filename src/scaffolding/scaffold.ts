/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep } from 'vscode-azureextensionui';
import { localize } from '../localize';
import { ChooseComposeStep } from './wizard/ChooseComposeStep';
import { ChoosePlatformStep } from './wizard/ChoosePlatformStep';
import { ChooseWorkspaceFolderStep } from './wizard/ChooseWorkspaceFolderStep';
import { ScaffoldDebuggingStep } from './wizard/ScaffoldDebuggingStep';
import { ScaffoldFileStep } from './wizard/ScaffoldFileStep';
import { ScaffoldingWizardContext } from './wizard/ScaffoldingWizardContext';

export async function scaffold(wizardContext: ScaffoldingWizardContext): Promise<void> {
    const promptSteps: AzureWizardPromptStep<ScaffoldingWizardContext>[] = [
        new ChooseWorkspaceFolderStep(),
        new ChooseComposeStep(),
        new ChoosePlatformStep(),
    ];

    const executeSteps: AzureWizardExecuteStep<ScaffoldingWizardContext>[] = [
        new ScaffoldFileStep<ScaffoldingWizardContext>('.dockerignore', 100),
        new ScaffoldFileStep<ScaffoldingWizardContext>('Dockerfile', 200),
        new ScaffoldFileStep<ScaffoldingWizardContext>('docker-compose.yml', 300),
        new ScaffoldFileStep<ScaffoldingWizardContext>('docker-compose.debug.yml', 400),
        new ScaffoldFileStep<ScaffoldingWizardContext>('requirements.txt', 500),
        new ScaffoldDebuggingStep(),
    ];

    const wizard = new AzureWizard<ScaffoldingWizardContext>(wizardContext, {
        promptSteps: promptSteps,
        executeSteps: executeSteps,
        title: localize('vscode-docker.scaffold.addDockerFiles', 'Add Docker Files'),
    });

    await wizard.prompt();
    await wizard.execute();
}
