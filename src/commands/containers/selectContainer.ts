/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';

export async function selectContainer(context: IActionContext): Promise<string> {

    let node: ContainerTreeItem;

    // Expecting running containers to change often as this is a debugging scenario.
    await ext.containersTree.refresh(context);

    node = await ext.containersTree.showTreeItemPicker(ContainerTreeItem.runningContainerRegExp, {
        ...context,
        noItemFoundErrorMessage: localize('vscode-docker.commands.containers.select.noContainers', 'No running containers are available')
    });

    return node.containerId;
}
