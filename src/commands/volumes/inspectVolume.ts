/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, openReadOnlyJson } from "@microsoft/vscode-azext-utils";
import { l10n } from 'vscode';
import { ext } from "../../extensionVariables";
import { VolumeTreeItem } from "../../tree/volumes/VolumeTreeItem";

export async function inspectVolume(context: IActionContext, node?: VolumeTreeItem): Promise<void> {
    if (!node) {
        await ext.volumesTree.refresh(context);
        node = await ext.volumesTree.showTreeItemPicker<VolumeTreeItem>(VolumeTreeItem.contextValue, { ...context, noItemFoundErrorMessage: l10n.t('No volumes are available to inspect') });
    }

    const inspectResult = await ext.runWithDefaults(client =>
        client.inspectVolumes({ volumes: [node.volumeName] })
    );
    await openReadOnlyJson(node, JSON.parse(inspectResult[0].raw));
}
