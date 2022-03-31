/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { DockerOSType } from '../../docker/Common';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';
import { executeAsTask } from '../../utils/executeAsTask';
import { execAsync } from '../../utils/spawnAsync';
import { selectAttachCommand } from '../selectCommandTemplate';

export async function attachShellContainer(context: IActionContext, node?: ContainerTreeItem): Promise<void> {
    if (!node) {
        await ext.containersTree.refresh(context);
        node = await ext.containersTree.showTreeItemPicker<ContainerTreeItem>(ContainerTreeItem.runningContainerRegExp, {
            ...context,
            noItemFoundErrorMessage: localize('vscode-docker.commands.containers.attachShellContainer.noContainers', 'No running containers are available to attach')
        });
    }

    let shellCommand: string;
    let osType: DockerOSType;
    try {
        osType = (await ext.dockerClient.inspectContainer(context, node.containerId))?.Platform || 'linux';
    } catch {
        // Assume Linux if the above fails
        osType = 'linux';
    }

    context.telemetry.properties.dockerOSType = osType;

    if (osType === 'windows') {
        // On Windows containers, always use cmd
        shellCommand = 'cmd';
    } else {
        const currentContext = await ext.dockerContextManager.getCurrentContext();

        if (currentContext.ContextType === 'aci') {
            // If it's ACI we have to do sh, because it's not possible to check if bash is present
            shellCommand = 'sh';
        } else {
            // On Linux containers, check if bash is present
            // If so use it, otherwise use sh
            try {
                // If this succeeds, bash is present (exit code 0)
                await execAsync(`${ext.dockerContextManager.getDockerCommand(context)} exec -i ${node.containerId} sh -c "which bash"`);
                shellCommand = 'bash';
            } catch {
                shellCommand = 'sh';
            }
        }
    }

    const terminalCommand = await selectAttachCommand(
        context,
        node.containerName,
        node.fullTag,
        node.containerId,
        shellCommand
    );

    const terminalTitle = localize('vscode-docker.commands.containers.attachShellContainer.terminalTitle', 'Shell: {0}', node.containerName);

    await executeAsTask(context, terminalCommand, terminalTitle, { addDockerEnv: true, alwaysRunNew: true, focus: true });
}
