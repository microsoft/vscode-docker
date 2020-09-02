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
    }

    public shouldPrompt(wizardContext: TWizardContext): boolean {
        return !wizardContext.serviceName || !wizardContext.version;
    }
}
