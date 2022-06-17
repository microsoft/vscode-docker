/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerOS } from '@microsoft/container-runtimes';
import { IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';
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
    let osType: ContainerOS;
    try {
        const inspectResults = await ext.defaultShellCR()(
            ext.containerClient.inspectContainers({ containers: [node.containerId] })
        );
        osType = inspectResults?.[0]?.operatingSystem || 'linux';
    } catch {
        // Assume Linux if the above fails
        osType = 'linux';
    }

    context.telemetry.properties.dockerOSType = osType;

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
                // TODO: Exec will not throw if it fails
                await ext.defaultShellCR()(
                    ext.containerClient.execContainer({ container: node.containerId, interactive: true, command: `sh -c "which bash"` })
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
        node.fullTag,
        node.containerId,
        shellCommand
    );

    const terminalTitle = localize('vscode-docker.commands.containers.attachShellContainer.terminalTitle', 'Shell: {0}', node.containerName);

    await executeAsTask(context, terminalCommand, terminalTitle, { addDockerEnv: true, alwaysRunNew: true, focus: true });
}
