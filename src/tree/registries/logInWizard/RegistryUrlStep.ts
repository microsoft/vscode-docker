/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URL } from 'url';
import { AzureWizardPromptStep } from 'vscode-azureextensionui';
import { ext } from '../../../extensionVariables';
import { ILogInWizardContext } from './ILogInWizardContext';

export class RegistryUrlStep extends AzureWizardPromptStep<ILogInWizardContext> {
    public async prompt(context: ILogInWizardContext): Promise<void> {
        const prompt: string = context.urlPrompt || "Enter the URL for the registry provider";
        const placeHolder: string = "Example: http://localhost:5000";
        context.url = (await ext.ui.showInputBox({
            prompt,
            placeHolder,
            validateInput: v => this.validateUrl(context, v)
        }));
    }

    public shouldPrompt(context: ILogInWizardContext): boolean {
        return !!context.includeUrl && !context.url;
    }

    private validateUrl(context: ILogInWizardContext, value: string): string | undefined {
        if (!value) {
            return "URL cannot be empty.";
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
            } else if (context.existingProviders.find(rp => rp.url === value)) {
                return `URL "${value}" is already connected.`;
            } else {
                return undefined;
            }
        }
    }
}
