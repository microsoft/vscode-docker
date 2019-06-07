/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { ext } from "../../../extensionVariables";
import { AzureTagTreeItem } from "../../../tree/registries/azure/AzureTagTreeItem";
import { registryRequest } from "../../../utils/registryRequestUtils";

export async function untagAzureImage(context: IActionContext, node?: AzureTagTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<AzureTagTreeItem>(AzureTagTreeItem.contextValue, { ...context, suppressCreatePick: true });
    }

    const confirmUntag: string = `Are you sure you want to untag "${node.fullTag}"? This does not delete the manifest referenced by the tag.`;
    // no need to check result - cancel will throw a UserCancelledError
    await ext.ui.showWarningMessage(confirmUntag, { modal: true }, { title: "Untag" });

    const untagging = `Untagging "${node.fullTag}"...`;
    const repoTI = node.parent;
    await window.withProgress({ location: ProgressLocation.Notification, title: untagging }, async () => {
        await registryRequest(repoTI, 'DELETE', `v2/_acr/${repoTI.repoName}/tags/${node.tag}`);
        await repoTI.refresh();
    });

    // don't wait
    window.showInformationMessage(`Successfully untagged "${node.fullTag}".`);
}
