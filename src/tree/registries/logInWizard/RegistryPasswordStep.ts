/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from 'vscode-azureextensionui';
import { ext } from '../../../extensionVariables';
import { ILogInWizardContext } from './ILogInWizardContext';

export class RegistryPasswordStep extends AzureWizardPromptStep<ILogInWizardContext> {
    public async prompt(context: ILogInWizardContext): Promise<void> {
        const prompt = context.passwordPrompt || "Enter your password";
        context.password = await ext.ui.showInputBox({ prompt, validateInput, password: true });
    }

    public shouldPrompt(context: ILogInWizardContext): boolean {
        return !!context.includePassword && !context.password;
    }
}

function validateInput(value: string | undefined): string | undefined {
    if (!value) {
        return "Password cannot be empty."
    } else {
        return undefined;
    }
}
