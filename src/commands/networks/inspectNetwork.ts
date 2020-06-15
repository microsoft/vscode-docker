/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Network } from "dockerode";
import { IActionContext, openReadOnlyJson } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { NetworkTreeItem } from "../../tree/networks/NetworkTreeItem";
import { callDockerodeWithErrorHandling } from "../../utils/callDockerode";

export async function inspectNetwork(context: IActionContext, node?: NetworkTreeItem): Promise<void> {
    if (!node) {
        await ext.networksTree.refresh();
        node = await ext.networksTree.showTreeItemPicker<NetworkTreeItem>(NetworkTreeItem.allContextRegExp, {
            ...context,
            noItemFoundErrorMessage: localize('vscode-docker.commands.networks.inspect.noNetworks', 'No networks are available to inspect')
        });
    }

    const network: Network = await node.getNetwork()
    // eslint-disable-next-line @typescript-eslint/tslint/config
    const inspectInfo: unknown = await callDockerodeWithErrorHandling(async () => network.inspect(), context); // inspect is missing type in @types/dockerode
    await openReadOnlyJson(node, inspectInfo);
}
