/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from 'vscode';
import { DialogResponses, IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { AzureRepositoryTreeItem } from '../../tree/azure/AzureRepositoryTreeItem';

export async function deleteAzureRepository(context: IActionContext, node?: AzureRepositoryTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<AzureRepositoryTreeItem>(AzureRepositoryTreeItem.contextValue, { ...context, suppressCreatePick: true });
    }

    const confirmDelete = `Are you sure you want to delete repository "${node.repoName}" and its associated images?`;
    // no need to check result - cancel will throw a UserCancelledError
    await ext.ui.showWarningMessage(confirmDelete, { modal: true }, DialogResponses.deleteResponse);

    const deleting = `Deleting repository "${node.repoName}"...`;
    await window.withProgress({ location: ProgressLocation.Notification, title: deleting }, async () => {
        await node.deleteTreeItem(context);
    });

    const deleteSucceeded = `Successfully deleted repository "${node.repoName}".`;
    // don't wait
    window.showInformationMessage(deleteSucceeded);
}
