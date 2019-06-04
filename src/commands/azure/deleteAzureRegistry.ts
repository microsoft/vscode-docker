/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from 'vscode';
import { DialogResponses, IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { AzureRegistryTreeItem } from '../../tree/azure/AzureRegistryTreeItem';

export async function deleteAzureRegistry(context: IActionContext, node?: AzureRegistryTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<AzureRegistryTreeItem>(AzureRegistryTreeItem.contextValue, { ...context, suppressCreatePick: true });
    }

    const confirmDelete: string = `Are you sure you want to delete registry "${node.registryName}" and its associated images?`;
    // no need to check result - cancel will throw a UserCancelledError
    await ext.ui.showWarningMessage(confirmDelete, { modal: true }, DialogResponses.deleteResponse);

    const deleting = `Deleting registry "${node.registryName}"...`;
    await window.withProgress({ location: ProgressLocation.Notification, title: deleting }, async () => {
        await node.deleteTreeItem(context);
    });

    const message = `Successfully deleted registry "${node.registryName}".`;
    // don't wait
    window.showInformationMessage(message);
}
