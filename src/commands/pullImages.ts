/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Terminal } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { ext } from '../extensionVariables';
import { DockerHubNamespaceTreeItem } from '../tree/dockerHub/DockerHubNamespaceTreeItem';
import { RegistryTreeItemBase } from '../tree/RegistryTreeItemBase';
import { RemoteRepositoryTreeItemBase } from "../tree/RemoteRepositoryTreeItemBase";
import { RemoteTagTreeItemBase } from '../tree/RemoteTagTreeItemBase';
import { logInToDockerCli } from "./logInToDockerCli";

export async function pullRepository(context: IActionContext, node?: RemoteRepositoryTreeItemBase): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<RemoteRepositoryTreeItemBase>(RemoteRepositoryTreeItemBase.allContextRegExp, context);
    }

    await pullImages(context, node.parent, node.repoName + ' -a');
}

export async function pullImage(context: IActionContext, node?: RemoteTagTreeItemBase): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<RemoteTagTreeItemBase>(RemoteTagTreeItemBase.allContextRegExp, context);
    }

    await pullImages(context, node.parent.parent, node.fullTag);
}

async function pullImages(context: IActionContext, node: RegistryTreeItemBase, imageRequest: string): Promise<void> {
    await logInToDockerCli(context, node);

    let imagePath: string = node instanceof DockerHubNamespaceTreeItem ? node.namespace : node.host;
    const terminal: Terminal = ext.terminalProvider.createTerminal("docker pull");
    terminal.show();
    terminal.sendText(`docker pull ${imagePath}/${imageRequest}`);
}
