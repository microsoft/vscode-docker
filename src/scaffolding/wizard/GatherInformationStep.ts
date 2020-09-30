/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getValidImageNameFromPath } from '../../utils/getValidImageName';
import { ScaffoldingWizardContext } from './ScaffoldingWizardContext';
import { TelemetryPromptStep } from './TelemetryPromptStep';

export class GatherInformationStep<TWizardContext extends ScaffoldingWizardContext> extends TelemetryPromptStep<TWizardContext> {
    public async prompt(wizardContext: TWizardContext): Promise<void> {
        if (!wizardContext.serviceName) {
            wizardContext.serviceName = getValidImageNameFromPath(wizardContext.workspaceFolder.uri.fsPath);
        }

        if (!wizardContext.version) {
            wizardContext.version = '0.0.1';
        }

        if (!wizardContext.dockerBuildContext) {
            // Most platforms (except Node) always use the root as the build context
            wizardContext.dockerBuildContext = wizardContext.workspaceFolder.uri.fsPath;
        }

        if (!wizardContext.dockerfileDirectory) {
            // Most platforms (except Node and .NET) always place the Dockerfile at the root
            wizardContext.dockerfileDirectory = wizardContext.workspaceFolder.uri.fsPath;
        }
    }

    public shouldPrompt(wizardContext: TWizardContext): boolean {
        return !wizardContext.serviceName || !wizardContext.version || !wizardContext.dockerBuildContext || !wizardContext.dockerfileDirectory;
    }
}
