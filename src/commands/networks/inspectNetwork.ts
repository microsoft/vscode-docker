/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Network } from "dockerode";
import { IActionContext, openReadOnlyJson } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { NetworkTreeItem } from "../../tree/networks/NetworkTreeItem";
import { callDockerodeWithErrorHandling } from "../../utils/callDockerodeWithErrorHandling";

export async function inspectNetwork(context: IActionContext, node?: NetworkTreeItem): Promise<void> {
    if (!node) {
        node = await ext.networksTree.showTreeItemPicker<NetworkTreeItem>(NetworkTreeItem.allContextRegExp, {
            ...context,
            noItemFoundErrorMessage: 'No networks are available to inspect'
        });
    }

    const network: Network = node.getNetwork()
    // eslint-disable-next-line @typescript-eslint/promise-function-async, @typescript-eslint/tslint/config
    const inspectInfo: {} = await callDockerodeWithErrorHandling(() => network.inspect(), context); // inspect is missing type in @types/dockerode
    await openReadOnlyJson(node, inspectInfo);
}
