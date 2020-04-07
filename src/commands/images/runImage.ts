/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ImageTreeItem } from '../../tree/images/ImageTreeItem';
import { callDockerode } from '../../utils/callDockerode';
import { selectRunCommand } from '../selectCommandTemplate';

export async function runImage(context: IActionContext, node?: ImageTreeItem): Promise<void> {
    return await runImageCore(context, node, false);
}

export async function runImageInteractive(context: IActionContext, node?: ImageTreeItem): Promise<void> {
    await runImageCore(context, node, true);
}

async function runImageCore(context: IActionContext, node: ImageTreeItem | undefined, interactive: boolean): Promise<void> {
    if (!node) {
        node = await ext.imagesTree.showTreeItemPicker<ImageTreeItem>(ImageTreeItem.contextValue, {
            ...context,
            noItemFoundErrorMessage: localize('vscode-docker.commands.images.run.noImages', 'No images are available to run')
        });
    }

    const image = await node.getImage();
    const inspectInfo = await callDockerode(async () => image.inspect());

    const terminalCommand = await selectRunCommand(
        context,
        node.fullTag,
        interactive,
        inspectInfo?.Config?.ExposedPorts
    );

    const terminal = ext.terminalProvider.createTerminal(node.fullTag);
    terminal.sendText(terminalCommand);
    terminal.show();
}
