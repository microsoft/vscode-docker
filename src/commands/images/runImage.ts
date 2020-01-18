/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { ImageTreeItem } from '../../tree/images/ImageTreeItem';

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
            noItemFoundErrorMessage: 'No images are availalbe to run'
        });
    }

    const inspectInfo = await node.getImage().inspect();
    const ports: string[] = inspectInfo.Config.ExposedPorts ? Object.keys(inspectInfo.Config.ExposedPorts) : [];

    let options = `--rm ${interactive ? '-it' : '-d'}`;
    if (ports.length) {
        const portMappings = ports.map((port) => `-p ${port.split("/")[0]}:${port}`); // 'port' is of the form number/protocol, eg. 8080/udp.
        // In the command, the host port has just the number (mentioned in the EXPOSE step), while the destination port can specify the protocol too
        options += ` ${portMappings.join(' ')}`;
    }

    const terminal = ext.terminalProvider.createTerminal(node.fullTag);
    terminal.sendText(`docker run ${options} ${node.fullTag}`);
    terminal.show();
}
