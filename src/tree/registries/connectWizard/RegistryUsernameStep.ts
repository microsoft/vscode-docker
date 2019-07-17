/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { InputBoxOptions } from 'vscode';
import { AzureWizardPromptStep } from 'vscode-azureextensionui';
import { ext } from '../../../extensionVariables';
import { IConnectRegistryWizardContext } from './IConnectRegistryWizardContext';

export class RegistryUsernameStep extends AzureWizardPromptStep<IConnectRegistryWizardContext> {
    public async prompt(context: IConnectRegistryWizardContext): Promise<void> {
        let prompt: string = context.usernamePrompt || (context.isUsernameOptional ? "Enter your username, or press 'Enter' for none" : "Enter your username");
        const options: InputBoxOptions = {
            prompt,
            validateInput: (value: string | undefined) => this.validateInput(context, value)
        };

        context.username = await ext.ui.showInputBox(options);

        if (!context.username) {
            context.includePassword = false;
        }
    }

    public shouldPrompt(context: IConnectRegistryWizardContext): boolean {
        return !!context.includeUsername && !context.username;
    }

    private validateInput(context: IConnectRegistryWizardContext, value: string | undefined): string | undefined {
        if (!context.isUsernameOptional && !value) {
            return "Username cannot be empty."
        } else if (context.existingProviders.find(rp => rp.url === context.url && rp.username === value)) {
            return `Username "${value}" is already connected.`;
        } else {
            return undefined;
        }
    }
}
