/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DialogResponses, IActionContext } from '@microsoft/vscode-azext-utils';
import { ProgressLocation, window } from 'vscode';
import { ext } from '../../../extensionVariables';
import { localize } from "../../../localize";
import type { AzureRegistryTreeItem } from '../../../tree/registries/azure/AzureRegistryTreeItem';
import { registryExpectedContextValues } from '../../../tree/registries/registryContextValues';

export async function deleteAzureRegistry(context: IActionContext, node?: AzureRegistryTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<AzureRegistryTreeItem>(registryExpectedContextValues.azure.registry, { ...context, suppressCreatePick: true });
    }

    const confirmDelete: string = localize('vscode-docker.commands.registries.azure.deleteRegistry.confirm', 'Are you sure you want to delete registry "{0}" and its associated images?', node.registryName);
    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmDelete, { modal: true }, DialogResponses.deleteResponse);

    const deleting = localize('vscode-docker.commands.registries.azure.deleteRegistry.deleting', 'Deleting registry "{0}"...', node.registryName);
    await window.withProgress({ location: ProgressLocation.Notification, title: deleting }, async () => {
        await node.deleteTreeItem(context);
    });

    const message = localize('vscode-docker.commands.registries.azure.deleteRegistry.deleted', 'Successfully deleted registry "{0}".', node.registryName);
    // don't wait
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    window.showInformationMessage(message);
}
