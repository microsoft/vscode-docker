/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, contextValueExperience, createSubscriptionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../../../extensionVariables';
import { AzureRegistry, AzureRepository, AzureSubscriptionRegistryItem, isAzureRegistry, isAzureSubscriptionRegistryItem } from '../../../tree/registries/Azure/AzureRegistryDataProvider';
import { UnifiedRegistryItem, isUnifiedRegistryItem } from '../../../tree/registries/UnifiedRegistryTreeDataProvider';
import { getAzExtAzureUtils } from '../../../utils/lazyPackages';

export async function openInAzurePortal(context: IActionContext, node?: UnifiedRegistryItem<AzureRegistry | AzureSubscriptionRegistryItem | AzureRepository>): Promise<void> {
    if (!node) {
        node = await contextValueExperience(context, ext.azureRegistryDataProvider, { include: ['azureContainerRegistry'] });
    }

    const azureRegistryItem = isUnifiedRegistryItem(node) ? node.wrappedItem : node;
    const azExtAzureUtils = await getAzExtAzureUtils();
    let subscriptionContext = undefined;
    if (isAzureSubscriptionRegistryItem(azureRegistryItem)) {
        subscriptionContext = createSubscriptionContext(azureRegistryItem.subscription);
        await azExtAzureUtils.openInPortal(subscriptionContext, `/subscriptions/${subscriptionContext.subscriptionId}`);
    } else if (isAzureRegistry(azureRegistryItem)) {
        subscriptionContext = createSubscriptionContext(azureRegistryItem.parent.subscription);
        await azExtAzureUtils.openInPortal(subscriptionContext, azureRegistryItem.id);
    } else {
        subscriptionContext = createSubscriptionContext(azureRegistryItem.parent.parent.subscription);
        await azExtAzureUtils.openInPortal(subscriptionContext, `${azureRegistryItem.parent.id}/repository`);
    }
}
