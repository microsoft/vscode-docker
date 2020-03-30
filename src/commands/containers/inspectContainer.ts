/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerInspectInfo } from "dockerode";
import { IActionContext, openReadOnlyJson } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { ContainerTreeItem } from "../../tree/containers/ContainerTreeItem";
import { callDockerodeWithErrorHandling } from "../../utils/callDockerode";

export async function inspectContainer(context: IActionContext, node?: ContainerTreeItem): Promise<void> {
    if (!node) {
        node = await ext.containersTree.showTreeItemPicker<ContainerTreeItem>(ContainerTreeItem.allContextRegExp, {
            ...context,
            noItemFoundErrorMessage: localize('vscode-docker.commands.containers.inspect.noContainers', 'No containers are available to inspect')
        });
    }

    const container = await node.getContainer();
    const inspectInfo: ContainerInspectInfo = await callDockerodeWithErrorHandling(async () => container.inspect(), context);
    await openReadOnlyJson(node, inspectInfo);
}
