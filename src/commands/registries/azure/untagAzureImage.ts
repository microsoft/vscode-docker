/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { ProgressLocation, window } from "vscode";
import { ext } from "../../../extensionVariables";
import { localize } from "../../../localize";
import { registryExpectedContextValues } from "../../../tree/registries/registryContextValues";
import { RemoteTagTreeItem } from "../../../tree/registries/RemoteTagTreeItem";
import { registryRequest } from "../../../utils/registryRequestUtils";

export async function untagAzureImage(context: IActionContext, node?: RemoteTagTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<RemoteTagTreeItem>(registryExpectedContextValues.azure.tag, {
            ...context,
            suppressCreatePick: true,
            noItemFoundErrorMessage: localize('vscode-docker.commands.registries.azure.untag.noImages', 'No images are available to untag')
        });
    }

    const confirmUntag: string = localize('vscode-docker.commands.registries.azure.untag.confirm', 'Are you sure you want to untag "{0}"? This does not delete the manifest referenced by the tag.', node.repoNameAndTag);
    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmUntag, { modal: true }, { title: "Untag" });

    const untagging = localize('vscode-docker.commands.registries.azure.untag.untagging', 'Untagging "{0}"...', node.repoNameAndTag);
    const repoTI = node.parent;
    await window.withProgress({ location: ProgressLocation.Notification, title: untagging }, async () => {
        await registryRequest(repoTI, 'DELETE', `v2/_acr/${repoTI.repoName}/tags/${node.tag}`);
        await repoTI.refresh(context);
    });

    // don't wait
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    window.showInformationMessage(localize('vscode-docker.commands.registries.azure.untag.untagged', 'Successfully untagged "{0}".', node.repoNameAndTag));
}
