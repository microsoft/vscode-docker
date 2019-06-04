/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from 'vscode-azureextensionui';
import { ext } from '../../../extensionVariables';
import { IDockerHubWizardContext } from './IDockerHubWizardContext';

export class DockerHubUsernameStep extends AzureWizardPromptStep<IDockerHubWizardContext> {
    public async prompt(context: IDockerHubWizardContext): Promise<void> {
        const prompt: string = "Enter your Docker ID";
        context.username = await ext.ui.showInputBox({ prompt, validateInput });
    }

    public shouldPrompt(context: IDockerHubWizardContext): boolean {
        return !context.username;
    }
}

function validateInput(value: string | undefined): string | undefined {
    if (!value) {
        return "Docker ID cannot be empty."
    } else {
        return undefined;
    }
}
