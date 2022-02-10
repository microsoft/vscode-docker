/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../../../extensionVariables';
import { AzureRegistryTreeItem } from '../../../tree/registries/azure/AzureRegistryTreeItem';
import { AzureRepositoryTreeItem } from '../../../tree/registries/azure/AzureRepositoryTreeItem';
import { SubscriptionTreeItem } from '../../../tree/registries/azure/SubscriptionTreeItem';
import { registryExpectedContextValues } from '../../../tree/registries/registryContextValues';
import { getAzExtAzureUtils } from '../../../utils/lazyPackages';

export async function openInAzurePortal(context: IActionContext, node?: SubscriptionTreeItem | AzureRegistryTreeItem | AzureRepositoryTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<AzureRegistryTreeItem>(registryExpectedContextValues.azure.registry, context);
    }

    const azExtAzureUtils = await getAzExtAzureUtils();

    if (node instanceof SubscriptionTreeItem) {
        await azExtAzureUtils.openInPortal(node.subscription, node.subscription.subscriptionId);
    } else if (node instanceof AzureRegistryTreeItem) {
        await azExtAzureUtils.openInPortal(node.parent.subscription, node.registryId);
    } else {
        await azExtAzureUtils.openInPortal(node.parent.parent.subscription, `${node.parent.registryId}/repository`);
    }
}
