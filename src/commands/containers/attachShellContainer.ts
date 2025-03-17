/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { composeArgs, ContainerOS, VoidCommandResponse, withArg, withQuotedArg } from '@microsoft/vscode-container-client';
import { l10n } from 'vscode';
import { ext } from '../../extensionVariables';
import { TaskCommandRunnerFactory } from '../../runtimes/runners/TaskCommandRunnerFactory';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';
import { getDockerOSType } from '../../utils/osUtils';
import { selectAttachCommand } from '../selectCommandTemplate';

export async function attachShellContainer(context: IActionContext, node?: ContainerTreeItem): Promise<void> {
    if (!node) {
        await ext.containersTree.refresh(context);
        node = await ext.containersTree.showTreeItemPicker<ContainerTreeItem>(ContainerTreeItem.runningContainerRegExp, {
            ...context,
            noItemFoundErrorMessage: l10n.t('No running containers are available to attach')
        });
    }

    const osType: ContainerOS = await getDockerOSType();
    context.telemetry.properties.dockerOSType = osType;

    let shellCommand: string;
    if (osType === 'windows') {
        // On Windows containers, always use cmd
        shellCommand = 'cmd';
    } else {
        // On Linux containers, check if bash is present
        // If so use it, otherwise use sh
        try {
            const command = composeArgs(
                withArg('sh', '-c'),
                withQuotedArg('which bash'),
            )();

            // If this succeeds, bash is present (exit code 0)
            await ext.runWithDefaults(client =>
                // Since we're not interested in the output, just the exit code, we can pretend this is a `VoidCommandResponse`
                client.execContainer({ container: node.containerId, interactive: true, command: command }) as Promise<VoidCommandResponse>
            );
            shellCommand = 'bash';
        } catch {
            shellCommand = 'sh';
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
        taskName: l10n.t('Shell: {0}', node.containerName),
        alwaysRunNew: true,
        focus: true,
    });

    await taskCRF.getCommandRunner()(terminalCommand);
}
