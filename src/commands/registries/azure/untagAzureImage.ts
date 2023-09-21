/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { l10n, ProgressLocation, window } from "vscode";
import { ext } from "../../../extensionVariables";
import { AzureRegistryDataProvider, AzureTag } from "../../../tree/registries/Azure/AzureRegistryDataProvider";
import { getFullImageNameFromRegistryTagItem } from "../../../tree/registries/registryTreeUtils";
import { UnifiedRegistryItem } from "../../../tree/registries/UnifiedRegistryTreeDataProvider";
import { registryExperience } from "../../../utils/registryExperience";

export async function untagAzureImage(context: IActionContext, node?: UnifiedRegistryItem<AzureTag>): Promise<void> {
    if (!node) {
        // we can't pass in the azure tree provider because it's not a UnifiedRegistryItem and we need the provider to untag
        node = await registryExperience<AzureTag>(context, {
            registryFilter: { include: [ext.azureRegistryDataProvider.label] },
            contextValueFilter: { include: /commontag/i },
        });
    }

    const fullTag = getFullImageNameFromRegistryTagItem(node.wrappedItem);
    const confirmUntag: string = l10n.t('Are you sure you want to untag image "{0}"? This does not delete the manifest referenced by the tag.', fullTag);
    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmUntag, { modal: true }, { title: "Untag" });

    const untagging = l10n.t('Untagging image "{0}"...', fullTag);
    await window.withProgress({ location: ProgressLocation.Notification, title: untagging }, async () => {
        const provider = node.provider as unknown as AzureRegistryDataProvider;
        await provider.untagImage(node.wrappedItem);
    });

    // don't wait
    void ext.registriesTree.refresh();
    void window.showInformationMessage(l10n.t('Successfully untagged image "{0}".', fullTag));
}
