/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { l10n } from 'vscode';
import { ext } from '../../extensionVariables';
import { TaskCommandRunnerFactory } from '../../runtimes/runners/TaskCommandRunnerFactory';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';
import { selectLogsCommand } from '../selectCommandTemplate';

export async function viewContainerLogs(context: IActionContext, node?: ContainerTreeItem): Promise<void> {
    if (!node) {
        await ext.containersTree.refresh(context);
        node = await ext.containersTree.showTreeItemPicker<ContainerTreeItem>(ContainerTreeItem.allContextRegExp, {
            ...context,
            noItemFoundErrorMessage: l10n.t('No containers are available to view logs')
        });
    }

    const terminalCommand = await selectLogsCommand(
        context,
        node.containerName,
        node.imageName,
        node.containerId
    );

    const taskCRF = new TaskCommandRunnerFactory({
        taskName: l10n.t('Logs: {0}', node.containerName),
        alwaysRunNew: true,
        focus: true,
    });

    await taskCRF.getCommandRunner()(terminalCommand);
}
