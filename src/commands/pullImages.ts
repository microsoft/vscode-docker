/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Terminal } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { ext } from '../extensionVariables';
import { DockerHubRegistryTreeItem } from '../tree/dockerHub/DockerHubRegistryTreeItem';
import { RegistryTreeItemBase } from '../tree/RegistryTreeItemBase';
import { RepositoryTreeItemBase } from "../tree/RepositoryTreeItemBase";
import { TagTreeItemBase } from '../tree/TagTreeItemBase';
import { logInToDockerCli } from "./logInToDockerCli";

export async function pullRepository(context: IActionContext, node?: RepositoryTreeItemBase): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<RepositoryTreeItemBase>(RepositoryTreeItemBase.allContextRegExp, context);
    }

    await pullImages(context, node.parent, node.repoName + ' -a');
}

export async function pullImage(context: IActionContext, node?: TagTreeItemBase): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<TagTreeItemBase>(TagTreeItemBase.allContextRegExp, context);
    }

    await pullImages(context, node.parent.parent, node.fullTag);
}

async function pullImages(context: IActionContext, node: RegistryTreeItemBase, imageRequest: string): Promise<void> {
    await logInToDockerCli(context, node);

    let imagePath: string = node instanceof DockerHubRegistryTreeItem ? node.namespace : node.host;
    const terminal: Terminal = ext.terminalProvider.createTerminal("docker pull");
    terminal.show();
    terminal.sendText(`docker pull ${imagePath}/${imageRequest}`);
}
