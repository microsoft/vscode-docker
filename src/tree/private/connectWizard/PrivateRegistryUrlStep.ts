/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URL } from 'url';
import { AzureWizardPromptStep } from 'vscode-azureextensionui';
import { ext } from '../../../extensionVariables';
import { IPrivateRegistryWizardContext } from './IPrivateRegistryWizardContext';

export class PrivateRegistryUrlStep extends AzureWizardPromptStep<IPrivateRegistryWizardContext> {
    public async prompt(context: IPrivateRegistryWizardContext): Promise<void> {
        const prompt: string = "Enter the URL for the registry (OAuth not yet supported)";
        const placeHolder: string = "Example: http://localhost:5000";
        context.newRegistryUrl = (await ext.ui.showInputBox({
            prompt,
            placeHolder,
            validateInput: v => this.validateUrl(context, v)
        }));
    }

    public shouldPrompt(context: IPrivateRegistryWizardContext): boolean {
        return !context.newRegistryUrl;
    }

    private validateUrl(context: IPrivateRegistryWizardContext, value: string): string | undefined {
        if (!value) {
            return "Registry URL cannot be empty.";
        } else {
            let protocol: string | undefined;
            let host: string | undefined;
            try {
                let uri = new URL(value);
                protocol = uri.protocol;
                host = uri.host;
            } catch {
                // ignore
            }

            if (!protocol || !host) {
                return "Please enter a valid URL";
            } else if (context.existingUrls.find(u => u === value)) {
                return `Private registry "${value}" is already connected.`;
            } else {
                return undefined;
            }
        }
    }
}
