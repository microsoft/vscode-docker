/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';
import { executeAsTask } from '../../utils/executeAsTask';
import { selectLogsCommand } from '../selectCommandTemplate';

export async function viewContainerLogs(context: IActionContext, node?: ContainerTreeItem): Promise<void> {
    if (!node) {
        await ext.containersTree.refresh(context);
        node = await ext.containersTree.showTreeItemPicker<ContainerTreeItem>(ContainerTreeItem.allContextRegExp, {
            ...context,
            noItemFoundErrorMessage: localize('vscode-docker.commands.containers.viewLogs.noContainers', 'No containers are available to view logs')
        });
    }

    const terminalCommand = await selectLogsCommand(
        context,
        node.containerName,
        node.fullTag,
        node.containerId
    );

    const terminalTitle = localize('vscode-docker.commands.containers.viewLogs.terminalTitle', 'Logs: {0}', node.containerName);

    await executeAsTask(context, terminalCommand, terminalTitle, { addDockerEnv: true });
}
