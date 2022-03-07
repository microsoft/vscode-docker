/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, openReadOnlyJson } from "@microsoft/vscode-azext-utils";
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { NetworkTreeItem } from "../../tree/networks/NetworkTreeItem";

export async function inspectNetwork(context: IActionContext, node?: NetworkTreeItem): Promise<void> {
    if (!node) {
        await ext.networksTree.refresh(context);
        node = await ext.networksTree.showTreeItemPicker<NetworkTreeItem>(NetworkTreeItem.allContextRegExp, {
            ...context,
            noItemFoundErrorMessage: localize('vscode-docker.commands.networks.inspect.noNetworks', 'No networks are available to inspect')
        });
    }

    const inspectInfo = await ext.dockerClient.inspectNetwork(context, node.networkId);
    await openReadOnlyJson(node, inspectInfo);
}
