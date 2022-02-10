/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import { URL } from 'url';
import { localize } from '../../../localize';
import { IConnectRegistryWizardContext } from './IConnectRegistryWizardContext';

export class RegistryUrlStep extends AzureWizardPromptStep<IConnectRegistryWizardContext> {
    public async prompt(context: IConnectRegistryWizardContext): Promise<void> {
        const prompt: string = context.urlPrompt || localize('vscode-docker.tree.registries.connectWizard.enterUrl', 'Enter the URL for the registry provider');
        const placeHolder: string = localize('vscode-docker.tree.registries.connectWizard.exampleUrl', 'Example: http://localhost:5000');
        context.url = (await context.ui.showInputBox({
            prompt,
            placeHolder,
            validateInput: v => this.validateUrl(context, v)
        }));
    }

    public shouldPrompt(context: IConnectRegistryWizardContext): boolean {
        return !!context.includeUrl && !context.url;
    }

    private validateUrl(context: IConnectRegistryWizardContext, value: string): string | undefined {
        if (!value) {
            return localize('vscode-docker.tree.registries.connectWizard.urlEmpty', 'URL cannot be empty.');
        } else {
            let protocol: string | undefined;
            let host: string | undefined;
            try {
                const uri = new URL(value);
                protocol = uri.protocol;
                host = uri.host;
            } catch {
                // ignore
            }

            if (!protocol || !host) {
                return localize('vscode-docker.tree.registries.connectWizard.validUrl', 'Please enter a valid URL');
            } else if (context.existingProviders.find(rp => rp.url === value)) {
                return localize('vscode-docker.tree.registries.connectWizard.urlConnected', 'URL "{0}" is already connected.', value);
            } else {
                return undefined;
            }
        }
    }
}
