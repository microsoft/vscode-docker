/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import { AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep } from 'vscode-azureextensionui';
import { localize } from '../localize';
import { pathNormalize } from '../utils/pathNormalize';
import { ChooseComposeStep } from './wizard/ChooseComposeStep';
import { ChooseOsStep } from './wizard/ChooseOsStep';
import { ChoosePlatformStep } from './wizard/ChoosePlatformStep';
import { ChooseWorkspaceFolderStep } from './wizard/ChooseWorkspaceFolderStep';
import { ScaffoldDebuggingStep } from './wizard/ScaffoldDebuggingStep';
import { ScaffoldFileStep } from './wizard/ScaffoldFileStep';
import { ScaffoldingWizardContext } from './wizard/ScaffoldingWizardContext';

export async function scaffold(wizardContext: ScaffoldingWizardContext): Promise<void> {
    const promptSteps: AzureWizardPromptStep<ScaffoldingWizardContext>[] = [
        new ChooseWorkspaceFolderStep(),
        new ChoosePlatformStep(),
        new ChooseOsStep(),
        new ChooseComposeStep(),
    ];

    const executeSteps: AzureWizardExecuteStep<ScaffoldingWizardContext>[] = [
        new ScaffoldFileStep('.dockerignore', 100),
        new ScaffoldFileStep('Dockerfile', 200),
        new ScaffoldFileStep('docker-compose.yml', 300),
        new ScaffoldFileStep('docker-compose.debug.yml', 400),
        new ScaffoldDebuggingStep(),
    ];

    const wizard = new AzureWizard<ScaffoldingWizardContext>(wizardContext, {
        promptSteps: promptSteps,
        executeSteps: executeSteps,
        title: localize('vscode-docker.scaffold.addDockerFiles', 'Add Docker Files'),
    });

    await wizard.prompt();

    // Fill in some calculated values
    if (wizardContext.artifact) {
        wizardContext.relativeArtifactPath = pathNormalize(
            path.relative(wizardContext.workspaceFolder.uri.fsPath, wizardContext.artifact),
            wizardContext.platformOs
        );

        wizardContext.relativeDockerfilePath = pathNormalize(
            path.relative(
                wizardContext.workspaceFolder.uri.fsPath,
                path.join(
                    path.dirname(wizardContext.artifact),
                    'Dockerfile'
                ),
            ),
            'Linux' // relativeDockerfilePath is used in compose files and must always be Unix-style
        );
    }

    await wizard.execute();
}
