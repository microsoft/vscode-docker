/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DialogResponses, IActionContext } from '@microsoft/vscode-azext-utils';
import { CommonTag, GenericRegistryV2DataProvider } from '@microsoft/vscode-docker-registries';
import { ProgressLocation, l10n, window } from 'vscode';
import { ext } from '../../extensionVariables';
import { UnifiedRegistryItem } from '../../tree/registries/UnifiedRegistryTreeDataProvider';
import { getImageNameFromRegistryTagItem } from '../../tree/registries/registryTreeUtils';
import { registryExperience } from '../../utils/registryExperience';

export async function deleteRemoteImage(context: IActionContext, node?: UnifiedRegistryItem<CommonTag>): Promise<void> {
    if (!node) {
        node = await registryExperience(context, ext.genericRegistryV2DataProvider, { include: ['commontag'] });
    }

    const tagName = getImageNameFromRegistryTagItem(node.wrappedItem);
    const confirmDelete = l10n.t('Are you sure you want to delete image "{0}"? This will delete all images that have the same digest.', tagName);
    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmDelete, { modal: true }, DialogResponses.deleteResponse);

    const deleting = l10n.t('Deleting image "{0}"...', tagName);
    await window.withProgress({ location: ProgressLocation.Notification, title: deleting }, async () => {
        const provider = node.provider as unknown as GenericRegistryV2DataProvider;
        await provider.deleteTag(node.wrappedItem);
    });

    // Other tags that also matched the image may have been deleted, so refresh the whole repository
    const message = l10n.t('Successfully deleted image "{0}".', tagName);
    // don't wait
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    window.showInformationMessage(message);
}
