/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from "@microsoft/vscode-azext-utils";
import { localize } from '../../../localize';
import { IAppServiceContainerWizardContext } from './deployImageToAzure';

export class WebSitesPortPromptStep extends AzureWizardPromptStep<IAppServiceContainerWizardContext> {

    public async prompt(context: IAppServiceContainerWizardContext): Promise<void> {
        const prompt: string = localize('vscode-docker.deployAppService.WebSitesPortPromptStep.whatPort', 'What port does your app listen on?');
        const placeHolder: string = '80';
        const value: string = '80';
        const portString: string = await context.ui.showInputBox({ prompt, placeHolder, value, validateInput });
        context.webSitesPort = parseInt(portString, 10);
    }

    public shouldPrompt(context: IAppServiceContainerWizardContext): boolean {
        return !!context.customLocation;
    }
}

function validateInput(value: string | undefined): string | undefined {
    if (Number(value)) {
        const port: number = parseInt(value, 10);
        if (port >= 1 && port <= 65535) {
            return undefined;
        }
    }

    return localize('vscode-docker.deployAppService.WebSitesPortPromptStep.InvalidPort', 'Port must be a positive integer (1 to 65535).');
}

