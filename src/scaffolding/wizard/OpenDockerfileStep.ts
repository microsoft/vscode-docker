/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { AzureWizardExecuteStep } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { ScaffoldingWizardContext } from './ScaffoldingWizardContext';

export class OpenDockerfileStep extends AzureWizardExecuteStep<ScaffoldingWizardContext> {
    // High priority number to make this execute after everything else
    public readonly priority: number = 10000;

    public async execute(wizardContext: ScaffoldingWizardContext, progress: never): Promise<void> {
        const dockerfilePath = path.join(wizardContext.dockerfileDirectory, 'Dockerfile');

        if (await fse.pathExists(dockerfilePath) &&
            await ext.experimentationService.isFlightEnabled('vscode-docker.openDockerfile')) {
            wizardContext.telemetry.properties.openedDockerfile = 'true';

            // Don't wait
            void vscode.window.showTextDocument(vscode.Uri.file(dockerfilePath));
        }
    }

    public shouldExecute(wizardContext: ScaffoldingWizardContext): boolean {
        // Only open the Dockerfile if we scaffolded it (as opposed to doing just compose or debug init)
        return wizardContext.scaffoldType === 'all';
    }
}
