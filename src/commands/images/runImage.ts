/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { ImageTreeItem } from '../../tree/images/ImageTreeItem';
import { selectTemplate } from '../selectTemplate';

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
            noItemFoundErrorMessage: 'No images are available to run'
        });
    }

    const inspectInfo = await node.getImage().inspect();
    let portsString: string | undefined;

    if (inspectInfo?.Config?.ExposedPorts) {
        portsString = Object.keys(inspectInfo.Config.ExposedPorts).reduce((partialPortsString: string, portAndProtocol: string) => {
            return `${partialPortsString} -p ${portAndProtocol.split('/')[0]}:${portAndProtocol}`
        });
    }

    const terminalCommand = await selectTemplate(
        context,
        interactive ? 'runInteractive' : 'run',
        `${node.fullTag}`,
        undefined,
        { 'exposedPorts': portsString, 'tag': node.fullTag }
    );

    const terminal = ext.terminalProvider.createTerminal(node.fullTag);
    terminal.sendText(terminalCommand);
    terminal.show();
}
