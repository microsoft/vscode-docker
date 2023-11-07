/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardExecuteStep } from '@microsoft/vscode-azext-utils';
import { parseDockerLikeImageName } from '@microsoft/vscode-container-client';
import * as vscode from 'vscode';
import { NormalizedImageNameInfo } from '../../../tree/images/NormalizedImageNameInfo';
import { PushImageWizardContext } from './PushImageWizardContext';

export class RegistryLoginStep extends AzureWizardExecuteStep<PushImageWizardContext> {
    public priority: number = 200;

    public async execute(wizardContext: PushImageWizardContext): Promise<void> {
        await vscode.commands.executeCommand('vscode-docker.registries.logInToDockerCli', wizardContext.connectedRegistry);
    }

    public shouldExecute(wizardContext: PushImageWizardContext): boolean {
        // If a registry was found/chosen and is still the same as the final tag's registry, try logging in
        if (!wizardContext.connectedRegistry) {
            return false;
        }

        const baseAuthority = wizardContext.connectedRegistry.wrappedItem.baseUrl.authority;
        const desiredRegistry = new NormalizedImageNameInfo(parseDockerLikeImageName(wizardContext.finalTag)).normalizedRegistry;
        return desiredRegistry === baseAuthority;
    }
}
