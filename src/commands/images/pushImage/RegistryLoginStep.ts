/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardExecuteStep } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { PushImageWizardContext } from './PushImageWizardContext';

export class RegistryLoginStep extends AzureWizardExecuteStep<PushImageWizardContext> {
    public priority: number = 100;

    public async execute(wizardContext: PushImageWizardContext): Promise<void> {
        await vscode.commands.executeCommand('vscode-docker.registries.logInToDockerCli', wizardContext.connectedRegistry);
    }

    public shouldExecute(wizardContext: PushImageWizardContext): boolean {
        // If a registry was found/chosen and is still the same as the final tag's registry, try logging in
        if (!wizardContext.connectedRegistry) {
            return false;
        }

        const baseImagePath = wizardContext.connectedRegistry.wrappedItem.baseUrl.authority;
        return wizardContext.finalTag.startsWith(baseImagePath);
    }
}
