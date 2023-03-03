/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, openReadOnlyJson } from "@microsoft/vscode-azext-utils";
import { l10n } from 'vscode';
import { ext } from "../../extensionVariables";
import { NetworkTreeItem } from "../../tree/networks/NetworkTreeItem";

export async function inspectNetwork(context: IActionContext, node?: NetworkTreeItem): Promise<void> {
    if (!node) {
        await ext.networksTree.refresh(context);
        node = await ext.networksTree.showTreeItemPicker<NetworkTreeItem>(NetworkTreeItem.allContextRegExp, {
            ...context,
            noItemFoundErrorMessage: l10n.t('No networks are available to inspect')
        });
    }

    const inspectResult = await ext.runWithDefaults(client =>
        client.inspectNetworks({ networks: [node.networkId] })
    );
    await openReadOnlyJson(node, JSON.parse(inspectResult[0].raw));
}
