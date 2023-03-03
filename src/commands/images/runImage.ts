/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { l10n } from 'vscode';
import { ext } from '../../extensionVariables';
import { TaskCommandRunnerFactory } from '../../runtimes/runners/TaskCommandRunnerFactory';
import { ImageTreeItem } from '../../tree/images/ImageTreeItem';
import { selectRunCommand } from '../selectCommandTemplate';

export async function runImage(context: IActionContext, node?: ImageTreeItem): Promise<void> {
    return await runImageCore(context, node, false);
}

export async function runImageInteractive(context: IActionContext, node?: ImageTreeItem): Promise<void> {
    await runImageCore(context, node, true);
}

async function runImageCore(context: IActionContext, node: ImageTreeItem | undefined, interactive: boolean): Promise<void> {
    if (!node) {
        await ext.imagesTree.refresh(context);
        node = await ext.imagesTree.showTreeItemPicker<ImageTreeItem>(ImageTreeItem.contextValue, {
            ...context,
            noItemFoundErrorMessage: l10n.t('No images are available to run')
        });
    }

    const inspectResult = await ext.runWithDefaults(client =>
        client.inspectImages({ imageRefs: [node.imageId] })
    );

    context.telemetry.properties.containerOS = inspectResult?.[0]?.operatingSystem || 'linux';

    const terminalCommand = await selectRunCommand(
        context,
        node.fullTag,
        interactive,
        inspectResult?.[0]?.ports
    );

    const taskCRF = new TaskCommandRunnerFactory(
        {
            taskName: node.fullTag,
            alwaysRunNew: interactive,
        }
    );

    await taskCRF.getCommandRunner()(terminalCommand);
}
