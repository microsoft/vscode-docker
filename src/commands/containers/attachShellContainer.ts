/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerOS } from '@microsoft/container-runtimes';
import { IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { TaskCommandRunnerFactory } from '../../runtimes/runners/TaskCommandRunnerFactory';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';
import { getDockerOSType } from '../../utils/osUtils';
import { selectAttachCommand } from '../selectCommandTemplate';

export async function attachShellContainer(context: IActionContext, node?: ContainerTreeItem): Promise<void> {
    if (!node) {
        await ext.containersTree.refresh(context);
        node = await ext.containersTree.showTreeItemPicker<ContainerTreeItem>(ContainerTreeItem.runningContainerRegExp, {
            ...context,
            noItemFoundErrorMessage: localize('vscode-docker.commands.containers.attachShellContainer.noContainers', 'No running containers are available to attach')
        });
    }

    const osType: ContainerOS = await getDockerOSType();
    context.telemetry.properties.dockerOSType = osType;

    let shellCommand: string;
    if (osType === 'windows') {
        // On Windows containers, always use cmd
        shellCommand = 'cmd';
    } else {
        if (await ext.runtimeManager.contextManager.isInCloudContext()) {
            // If it's ACI we have to do sh, because it's not possible to check if bash is present
            shellCommand = 'sh';
        } else {
            // On Linux containers, check if bash is present
            // If so use it, otherwise use sh
            try {
                // If this succeeds, bash is present (exit code 0)
                await ext.runWithDefaultShell(client =>
                    client.execContainer({ container: node.containerId, interactive: true, command: `sh -c "which bash"` })
                );
                shellCommand = 'bash';
            } catch {
                shellCommand = 'sh';
            }
        }
    }

    const terminalCommand = await selectAttachCommand(
        context,
        node.containerName,
        node.imageName,
        node.containerId,
        shellCommand
    );

    const taskCRF = new TaskCommandRunnerFactory({
        taskName: localize('vscode-docker.commands.containers.attachShellContainer.terminalTitle', 'Shell: {0}', node.containerName),
        alwaysRunNew: true,
        focus: true,
    });

    await taskCRF.getCommandRunner()(terminalCommand);
}
