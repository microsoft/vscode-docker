/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { l10n, ProgressLocation, window } from "vscode";
import { ext } from "../../../extensionVariables";
import { registryExpectedContextValues } from "../../../tree/registries/registryContextValues";
import { RemoteTagTreeItem } from "../../../tree/registries/RemoteTagTreeItem";
import { registryRequest } from "../../../utils/registryRequestUtils";

export async function untagAzureImage(context: IActionContext, node?: RemoteTagTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<RemoteTagTreeItem>(registryExpectedContextValues.azure.tag, {
            ...context,
            suppressCreatePick: true,
            noItemFoundErrorMessage: l10n.t('No images are available to untag')
        });
    }

    const confirmUntag: string = l10n.t('Are you sure you want to untag image "{0}"? This does not delete the manifest referenced by the tag.', node.repoNameAndTag);
    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmUntag, { modal: true }, { title: "Untag" });

    const untagging = l10n.t('Untagging image "{0}"...', node.repoNameAndTag);
    const repoTI = node.parent;
    await window.withProgress({ location: ProgressLocation.Notification, title: untagging }, async () => {
        await registryRequest(repoTI, 'DELETE', `v2/_acr/${repoTI.repoName}/tags/${node.tag}`);
        await repoTI.refresh(context);
    });

    // don't wait
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    window.showInformationMessage(l10n.t('Successfully untagged image "{0}".', node.repoNameAndTag));
}
