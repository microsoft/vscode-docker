/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DialogResponses, IActionContext } from '@microsoft/vscode-azext-utils';
import { l10n, ProgressLocation, window } from 'vscode';
import { ext } from '../../extensionVariables';
import { DockerV2TagTreeItem } from '../../tree/registries/dockerV2/DockerV2TagTreeItem';
import { registryExpectedContextValues } from '../../tree/registries/registryContextValues';

export async function deleteRemoteImage(context: IActionContext, node?: DockerV2TagTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<DockerV2TagTreeItem>(registryExpectedContextValues.dockerV2.tag, {
            ...context,
            suppressCreatePick: true,
            noItemFoundErrorMessage: l10n.t('No remote images are available to delete')
        });
    }

    const confirmDelete = l10n.t('Are you sure you want to delete image "{0}"? This will delete all images that have the same digest.', node.repoNameAndTag);
    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmDelete, { modal: true }, DialogResponses.deleteResponse);

    const repoTI = node.parent;
    const deleting = l10n.t('Deleting image "{0}"...', node.repoNameAndTag);
    await window.withProgress({ location: ProgressLocation.Notification, title: deleting }, async () => {
        await node.deleteTreeItem(context);
    });

    // Other tags that also matched the image may have been deleted, so refresh the whole repository
    await repoTI.refresh(context);
    const message = l10n.t('Successfully deleted image "{0}".', node.repoNameAndTag);
    // don't wait
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    window.showInformationMessage(message);
}
