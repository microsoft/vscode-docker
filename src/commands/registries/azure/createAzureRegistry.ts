/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizard, IActionContext, createSubscriptionContext, nonNullProp } from '@microsoft/vscode-azext-utils';
import { l10n, window } from 'vscode';
import { ext } from '../../../extensionVariables';
import { AzureSubscriptionRegistryItem } from '../../../tree/registries/Azure/AzureRegistryDataProvider';
import { AzureRegistryCreateStep } from '../../../tree/registries/Azure/createWizard/AzureRegistryCreateStep';
import { AzureRegistryNameStep } from '../../../tree/registries/Azure/createWizard/AzureRegistryNameStep';
import { AzureRegistrySkuStep } from '../../../tree/registries/Azure/createWizard/AzureRegistrySkuStep';
import { IAzureRegistryWizardContext } from '../../../tree/registries/Azure/createWizard/IAzureRegistryWizardContext';
import { UnifiedRegistryItem } from '../../../tree/registries/UnifiedRegistryTreeDataProvider';
import { getAzExtAzureUtils } from '../../../utils/lazyPackages';
import { subscriptionExperience } from '../../../utils/registryExperience';

export async function createAzureRegistry(context: IActionContext, node?: UnifiedRegistryItem<AzureSubscriptionRegistryItem>): Promise<string> {

    if (!node) {
        node = await subscriptionExperience(context);
    }

    const registryItem = node.wrappedItem;

    const subscriptionContext = createSubscriptionContext(registryItem.subscription);
    const wizardContext: IAzureRegistryWizardContext = {
        ...context,
        ...subscriptionContext,
        azureSubscription: registryItem.subscription,
    };
    const azExtAzureUtils = await getAzExtAzureUtils();

    const promptSteps = [
        new AzureRegistryNameStep(),
        new AzureRegistrySkuStep(),
        new azExtAzureUtils.ResourceGroupListStep(),
    ];
    azExtAzureUtils.LocationListStep.addStep(wizardContext, promptSteps);

    const wizard = new AzureWizard(
        wizardContext,
        {
            promptSteps,
            executeSteps: [
                new AzureRegistryCreateStep()
            ],
            title: l10n.t('Create new Azure Container Registry')
        }
    );

    await wizard.prompt();
    const newRegistryName: string = nonNullProp(wizardContext, 'newRegistryName');
    await wizard.execute();

    void window.showInformationMessage(`Successfully created registry "${newRegistryName}".`);
    void ext.registriesTree.refresh();

    return newRegistryName;
}
