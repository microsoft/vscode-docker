/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, openReadOnlyJson } from "@microsoft/vscode-azext-utils";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { VolumeTreeItem } from "../../tree/volumes/VolumeTreeItem";

export async function inspectVolume(context: IActionContext, node?: VolumeTreeItem): Promise<void> {
    if (!node) {
        await ext.volumesTree.refresh(context);
        node = await ext.volumesTree.showTreeItemPicker<VolumeTreeItem>(VolumeTreeItem.contextValue, { ...context, noItemFoundErrorMessage: localize('vscode-docker.commands.volumes.inspect.noVolumes', 'No volumes are available to inspect') });
    }

    const inspectInfo = await ext.dockerClient.inspectVolume(context, node.volumeName);
    await openReadOnlyJson(node, inspectInfo);
}
