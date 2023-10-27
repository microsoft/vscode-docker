/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import { tagImage } from '../tagImage';
import { PushImageWizardContext } from './PushImageWizardContext';

export class FinalTagPromptStep extends AzureWizardPromptStep<PushImageWizardContext> {
    public async prompt(wizardContext: PushImageWizardContext): Promise<void> {
        wizardContext.finalTag = await tagImage(wizardContext, wizardContext.node, wizardContext.connectedRegistry);
    }

    public shouldPrompt(wizardContext: PushImageWizardContext): boolean {
        return !wizardContext.finalTag;
    }
}
