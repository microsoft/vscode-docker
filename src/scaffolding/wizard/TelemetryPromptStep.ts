/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, IActionContext, IWizardOptions } from '@microsoft/vscode-azext-utils';

export abstract class TelemetryPromptStep<T extends IActionContext> extends AzureWizardPromptStep<T> {
    public async getSubWizard(wizardContext: T): Promise<IWizardOptions<T> | undefined> {
        // getSubWizard gets called after prompt regardless of whether or not prompt gets called. Returning undefined makes it so no actual subwizard results.

        if (this.setTelemetry) {
            this.setTelemetry(wizardContext);
        }

        return undefined;
    }

    protected setTelemetry?(wizardContext: T): void;
}
