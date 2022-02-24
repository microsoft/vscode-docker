/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DialogResponses, IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { NonComposeGroupName, getComposeProjectName } from '../../tree/containers/ContainersTreeItem';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';

export async function confirmAllAffectedContainers(context: IActionContext, nodes: ContainerTreeItem[]): Promise<string[]> {
    if (await ext.dockerContextManager.getCurrentContextType() !== 'aci' ||
        nodes.every(n => getComposeProjectName(n.containerItem) === NonComposeGroupName)) {
        // If we're not in an ACI context, or every node in the list is not part of any ACI container group, return unchanged
        return nodes.map(n => n.containerId);
    }

    const groupsSet = new Set<string>();

    nodes.forEach(n => {
        const groupName = getComposeProjectName(n.containerItem);

        groupsSet.add(groupName === NonComposeGroupName ? n.containerId : groupName);
    });

    const groupsList = Array.from(groupsSet);
    const groupsConfirm = groupsList.map(g => `'${g}'`).join(', ');

    const confirm = localize('vscode-docker.commands.containers.aciContainerActionWarning.confirm', 'ACI containers can only be started or stopped in a group. This action will apply to all containers in {0}. Do you want to proceed?', groupsConfirm);

    // No need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirm, { modal: true }, DialogResponses.yes);

    return groupsList;
}
