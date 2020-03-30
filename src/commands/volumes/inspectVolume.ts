/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Volume } from "dockerode";
import { IActionContext, openReadOnlyJson } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { VolumeTreeItem } from "../../tree/volumes/VolumeTreeItem";
import { callDockerodeWithErrorHandling } from "../../utils/callDockerode";

export async function inspectVolume(context: IActionContext, node?: VolumeTreeItem): Promise<void> {
    if (!node) {
        node = await ext.volumesTree.showTreeItemPicker<VolumeTreeItem>(VolumeTreeItem.contextValue, { ...context, noItemFoundErrorMessage: localize('vscode-docker.commands.volumes.inspect.noVolumes', 'No volumes are available to inspect') });
    }

    const volume: Volume = await node.getVolume();
    const inspectInfo = await callDockerodeWithErrorHandling(async () => volume.inspect(), context);
    await openReadOnlyJson(node, inspectInfo);
}
