/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DialogResponses, IActionContext } from '@microsoft/vscode-azext-utils';
import { ProgressLocation, window } from 'vscode';
import { ext } from '../../../extensionVariables';
import { localize } from "../../../localize";
import type { AzureRepositoryTreeItem } from '../../../tree/registries/azure/AzureRepositoryTreeItem';
import { registryExpectedContextValues } from '../../../tree/registries/registryContextValues';

export async function deleteAzureRepository(context: IActionContext, node?: AzureRepositoryTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<AzureRepositoryTreeItem>(registryExpectedContextValues.azure.repository, { ...context, suppressCreatePick: true });
    }

    const confirmDelete = localize('vscode-docker.commands.registries.azure.deleteRepository.confirm', 'Are you sure you want to delete repository "{0}" and its associated images?', node.repoName);
    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmDelete, { modal: true }, DialogResponses.deleteResponse);

    const deleting = localize('vscode-docker.commands.registries.azure.deleteRepository.deleting', 'Deleting repository "{0}"...', node.repoName);
    await window.withProgress({ location: ProgressLocation.Notification, title: deleting }, async () => {
        await node.deleteTreeItem(context);
    });

    const deleteSucceeded = localize('vscode-docker.commands.registries.azure.deleteRepository.deleted', 'Successfully deleted repository "{0}".', node.repoName);
    // don't wait
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    window.showInformationMessage(deleteSucceeded);
}
