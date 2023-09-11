/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DialogResponses, IActionContext, contextValueExperience } from '@microsoft/vscode-azext-utils';
import { ProgressLocation, l10n, window } from 'vscode';
import { ext } from '../../../extensionVariables';
import { AzureRegistry, AzureRegistryDataProvider } from '../../../tree/registries/Azure/AzureRegistryDataProvider';
import { UnifiedRegistryItem } from '../../../tree/registries/UnifiedRegistryTreeDataProvider';

export async function deleteAzureRegistry(context: IActionContext, node?: UnifiedRegistryItem<AzureRegistry>): Promise<void> {
    if (!node) {
        // we can't pass in the azure tree provider because it's not a UnifiedRegistryItem and we need the provider to delete
        node = await contextValueExperience(context, ext.registriesTree, { include: 'azureContainerRegistry' });
    }

    const registryName = node.wrappedItem.label;

    const confirmDelete: string = l10n.t('Are you sure you want to delete registry "{0}" and its associated images?', registryName);
    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmDelete, { modal: true }, DialogResponses.deleteResponse);

    const deleting = l10n.t('Deleting registry "{0}"...', registryName);
    await window.withProgress({ location: ProgressLocation.Notification, title: deleting }, async () => {
        const azureRegistryDataProvider = node.provider as unknown as AzureRegistryDataProvider;
        await azureRegistryDataProvider.deleteRegistry(node.wrappedItem);
    });

    void ext.registriesTree.refresh();

    const message = l10n.t('Successfully deleted registry "{0}".', registryName);
    // don't wait
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    window.showInformationMessage(message);
}
