/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import { InputBoxOptions } from 'vscode';
import { localize } from '../../../localize';
import { IConnectRegistryWizardContext } from './IConnectRegistryWizardContext';

export class RegistryUsernameStep extends AzureWizardPromptStep<IConnectRegistryWizardContext> {
    public async prompt(context: IConnectRegistryWizardContext): Promise<void> {
        const prompt: string = context.usernamePrompt || (context.isUsernameOptional ? localize('vscode-docker.tree.registries.connectWizard.enterUsernameOptional', 'Enter your username, or press \'Enter\' for none') : localize('vscode-docker.tree.registries.connectWizard.enterUsernameRequired', 'Enter your username'));
        const options: InputBoxOptions = {
            prompt,
            placeHolder: context.usernamePlaceholder,
            validateInput: (value: string | undefined) => this.validateInput(context, value)
        };

        context.username = await context.ui.showInputBox(options);

        if (!context.username) {
            context.includePassword = false;
        }
    }

    public shouldPrompt(context: IConnectRegistryWizardContext): boolean {
        return !!context.includeUsername && !context.username;
    }

    private validateInput(context: IConnectRegistryWizardContext, value: string | undefined): string | undefined {
        if (!context.isUsernameOptional && !value) {
            return localize('vscode-docker.tree.registries.connectWizard.usernameEmpty', 'Username cannot be empty.');
        } else if (context.existingProviders.find(rp => rp.url === context.url && rp.username === value)) {
            return localize('vscode-docker.tree.registries.connectWizard.usernameConnected', 'Username "{0}" is already connected.', value);
        } else {
            return undefined;
        }
    }
}
