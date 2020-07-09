/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';
import { executeAsTask } from '../../utils/executeAsTask';
import { getDockerOSType } from '../../utils/osUtils';
import { selectAttachCommand } from '../selectCommandTemplate';

export async function attachShellContainer(context: IActionContext, node?: ContainerTreeItem): Promise<void> {
    if (!node) {
        await ext.containersTree.refresh();
        node = await ext.containersTree.showTreeItemPicker<ContainerTreeItem>(ContainerTreeItem.runningContainerRegExp, {
            ...context,
            noItemFoundErrorMessage: localize('vscode-docker.commands.containers.attachShellContainer.noContainers', 'No running containers are available to attach')
        });
    }

    let shellCommand: string;
    let osType = await getDockerOSType(context);
    context.telemetry.properties.dockerOSType = osType;

    if (osType === 'windows') {
        // On Windows containers, always use cmd
        shellCommand = 'cmd';
    } else {
        // On Linux containers, check if bash is present
        // If so use it, otherwise use sh
        // TODO
    }

    const terminalCommand = await selectAttachCommand(
        context,
        node.containerName,
        node.fullTag,
        node.containerId,
        shellCommand
    );

    await executeAsTask(context, terminalCommand, `Shell: ${node.containerName}`, /* addDockerEnv: */ true);
}
