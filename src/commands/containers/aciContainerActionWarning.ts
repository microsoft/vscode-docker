/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DialogResponses, IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';

export async function aciContainerActionWarning(context: IActionContext, nodes: ContainerTreeItem[]): Promise<string[]> {
    if ((await ext.dockerContextManager.getCurrentContext()).Type !== 'aci') {
        return nodes.map(n => n.containerId);
    }

    const confirm = localize('vscode-docker.commands.containers.aciContainerActionWarning.confirm', 'ACI containers can only be started, stopped, or removed in a group. This action will apply to all containers in \'{0}\'. Do you want to proceed?');

    // No need to check result - cancel will throw a UserCancelledError
    await ext.ui.showWarningMessage(confirm, { modal: true }, DialogResponses.yes);

    // TODO
    return [foobarbaz];
}
