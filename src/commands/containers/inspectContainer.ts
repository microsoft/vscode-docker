/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, openReadOnlyJson } from "@microsoft/vscode-azext-utils";
import { l10n } from 'vscode';
import { ext } from "../../extensionVariables";
import { ContainerTreeItem } from "../../tree/containers/ContainerTreeItem";

export async function inspectContainer(context: IActionContext, node?: ContainerTreeItem): Promise<void> {
    if (!node) {
        await ext.containersTree.refresh(context);
        node = await ext.containersTree.showTreeItemPicker<ContainerTreeItem>(ContainerTreeItem.allContextRegExp, {
            ...context,
            noItemFoundErrorMessage: l10n.t('No containers are available to inspect')
        });
    }

    const inspectInfo = await ext.runWithDefaults(client =>
        client.inspectContainers({ containers: [node.containerId] })
    );
    await openReadOnlyJson(node, JSON.parse(inspectInfo[0].raw));
}
