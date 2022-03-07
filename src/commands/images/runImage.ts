/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ImageTreeItem } from '../../tree/images/ImageTreeItem';
import { executeAsTask } from '../../utils/executeAsTask';
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
            noItemFoundErrorMessage: localize('vscode-docker.commands.images.run.noImages', 'No images are available to run')
        });
    }

    const inspectInfo = await ext.dockerClient.inspectImage(context, node.imageId);

    context.telemetry.properties.containerOS = inspectInfo.Os || 'linux';

    const terminalCommand = await selectRunCommand(
        context,
        node.fullTag,
        interactive,
        inspectInfo?.Config?.ExposedPorts
    );

    await executeAsTask(context, terminalCommand, node.fullTag, { addDockerEnv: true, alwaysRunNew: interactive });
}
