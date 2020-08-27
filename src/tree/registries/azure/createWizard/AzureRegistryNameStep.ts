/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerRegistryManagementClient } from '@azure/arm-containerregistry';
import { AzureNameStep, createAzureClient, ResourceGroupListStep, resourceGroupNamingRules } from 'vscode-azureextensionui';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { IAzureRegistryWizardContext } from './IAzureRegistryWizardContext';

export class AzureRegistryNameStep extends AzureNameStep<IAzureRegistryWizardContext> {
    protected async isRelatedNameAvailable(context: IAzureRegistryWizardContext, name: string): Promise<boolean> {
        return await ResourceGroupListStep.isNameAvailable(context, name);
    }

    public async prompt(context: IAzureRegistryWizardContext): Promise<void> {
        const client = createAzureClient(context, ContainerRegistryManagementClient);
        context.newRegistryName = (await ext.ui.showInputBox({
            placeHolder: localize('vscode-docker.tree.registries.azure.createWizard.name', 'Registry name'),
            prompt: localize('vscode-docker.tree.registries.azure.createWizard.namePrompt', 'Provide a registry name'),
            /* eslint-disable-next-line @typescript-eslint/promise-function-async */
            validateInput: (name: string) => validateRegistryName(name, client)
        })).trim();

        context.relatedNameTask = this.generateRelatedName(context, context.newRegistryName, resourceGroupNamingRules);
    }

    public shouldPrompt(context: IAzureRegistryWizardContext): boolean {
        return !context.newRegistryName;
    }
}

async function validateRegistryName(name: string, client: ContainerRegistryManagementClient): Promise<string | undefined> {
    name = name ? name.trim() : '';

    const min = 5;
    const max = 50;
    if (name.length < min || name.length > max) {
        return localize('vscode-docker.tree.registries.azure.createWizard.nameLength', 'The name must be between {0} and {1} characters.', min, max);
    } else if (name.match(/[^a-z0-9]/i)) {
        return localize('vscode-docker.tree.registries.azure.createWizard.nameAlphanumeric', 'The name can only contain alphanumeric characters.');
    } else {
        const nameStatus = await client.registries.checkNameAvailability({ name });
        return nameStatus.message;
    }
}
