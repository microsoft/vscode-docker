/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DialogResponses, IActionContext, UserCancelledError, parseError } from '@microsoft/vscode-azext-utils';
import { CommonTag, GenericRegistryV2DataProvider } from '@microsoft/vscode-docker-registries';
import { ProgressLocation, l10n, window } from 'vscode';
import { ext } from '../../extensionVariables';
import { UnifiedRegistryItem } from '../../tree/registries/UnifiedRegistryTreeDataProvider';
import { getImageNameFromRegistryTagItem } from '../../tree/registries/registryTreeUtils';
import { registryExperience } from '../../utils/registryExperience';

export async function deleteRemoteImage(context: IActionContext, node?: UnifiedRegistryItem<CommonTag>): Promise<void> {
    if (!node) {
        node = await registryExperience(context, ext.registriesTree, { include: ['genericRegistryV2Tag', 'azureContainerTag', 'githubRegistryTag'] }, false);
    }

    const tagName = getImageNameFromRegistryTagItem(node.wrappedItem);
    const confirmDelete = l10n.t('Are you sure you want to delete image "{0}"? This will delete all images that have the same digest.', tagName);
    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmDelete, { modal: true }, DialogResponses.deleteResponse);

    const deleting = l10n.t('Deleting image "{0}"...', tagName);
    await window.withProgress({ location: ProgressLocation.Notification, title: deleting }, async () => {
        const provider = node.provider as unknown as GenericRegistryV2DataProvider;

        try {
            await provider.deleteTag(node.wrappedItem);
        } catch (error) {
            const errorType: string = parseError(error).errorType.toLowerCase();
            if (errorType === '405' || errorType === 'unsupported') {
                // Don't wait
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                context.ui.showWarningMessage('Deleting remote images is not supported on this registry. It may need to be enabled.', { learnMoreLink: 'https://aka.ms/AA7jsql' });
                throw new UserCancelledError();
            } else {
                throw error;
            }
        }
    });

    // TODO: investigate if we can do this for GitHub

    // Other tags that also matched the image may have been deleted, so refresh the whole repository
    // don't wait
    void ext.registriesTree.refresh();
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    window.showInformationMessage(l10n.t('Successfully deleted image "{0}".', tagName));
}
