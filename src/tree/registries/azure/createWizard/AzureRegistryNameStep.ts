/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { ContainerRegistryManagementClient } from '@azure/arm-containerregistry'; // These are only dev-time imports so don't need to be lazy
import { AzureNameStep } from '@microsoft/vscode-azext-utils';
import { localize } from '../../../../localize';
import { getArmContainerRegistry, getAzExtAzureUtils } from '../../../../utils/lazyPackages';
import { IAzureRegistryWizardContext } from './IAzureRegistryWizardContext';

export class AzureRegistryNameStep extends AzureNameStep<IAzureRegistryWizardContext> {
    protected async isRelatedNameAvailable(context: IAzureRegistryWizardContext, name: string): Promise<boolean> {
        const azExtAzureUtils = await getAzExtAzureUtils();
        return await azExtAzureUtils.ResourceGroupListStep.isNameAvailable(context, name);
    }

    public async prompt(context: IAzureRegistryWizardContext): Promise<void> {
        const azExtAzureUtils = await getAzExtAzureUtils();
        const armContainerRegistry = await getArmContainerRegistry();
        const client = azExtAzureUtils.createAzureClient(context, armContainerRegistry.ContainerRegistryManagementClient);
        context.newRegistryName = (await context.ui.showInputBox({
            placeHolder: localize('vscode-docker.tree.registries.azure.createWizard.name', 'Registry name'),
            prompt: localize('vscode-docker.tree.registries.azure.createWizard.namePrompt', 'Provide a registry name'),
            /* eslint-disable-next-line @typescript-eslint/promise-function-async */
            validateInput: (name: string) => validateRegistryName(name, client)
        })).trim();

        context.relatedNameTask = this.generateRelatedName(context, context.newRegistryName, azExtAzureUtils.resourceGroupNamingRules);
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
        const nameStatus = await client.registries.checkNameAvailability({ name, type: 'Microsoft.ContainerRegistry/registries' });
        return nameStatus.message;
    }
}
