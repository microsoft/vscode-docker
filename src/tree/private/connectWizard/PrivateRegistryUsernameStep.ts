/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from 'vscode-azureextensionui';
import { ext } from '../../../extensionVariables';
import { IPrivateRegistryWizardContext } from './IPrivateRegistryWizardContext';

export class PrivateRegistryUsernameStep extends AzureWizardPromptStep<IPrivateRegistryWizardContext> {
    public async prompt(context: IPrivateRegistryWizardContext): Promise<void> {
        const prompt: string = "Enter the username for connecting, or ENTER for none";
        context.newRegistryUsername = await ext.ui.showInputBox({ prompt });
    }

    public shouldPrompt(context: IPrivateRegistryWizardContext): boolean {
        return !context.newRegistryUsername;
    }
}
