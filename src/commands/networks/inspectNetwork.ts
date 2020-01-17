/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, openReadOnlyJson } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { NetworkTreeItem } from "../../tree/networks/NetworkTreeItem";

export async function inspectNetwork(context: IActionContext, node?: NetworkTreeItem): Promise<void> {
    if (!node) {
        node = await ext.networksTree.showTreeItemPicker<NetworkTreeItem>(NetworkTreeItem.contextValue, {
            ...context,
            noItemFoundErrorMessage: 'No images are availalbe to inspect'
        });
    }

    // tslint:disable-next-line: no-unsafe-any
    const inspectInfo: {} = await node.getNetwork().inspect(); // inspect is missing type in @types/dockerode
    await openReadOnlyJson(node, inspectInfo);
}
