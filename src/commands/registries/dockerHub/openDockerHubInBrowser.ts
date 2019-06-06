/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "vscode-azureextensionui";
import { dockerHubUrl } from "../../../constants";
import { ext } from "../../../extensionVariables";
import { DockerHubNamespaceTreeItem } from "../../../tree/registries/dockerHub/DockerHubNamespaceTreeItem";
import { DockerHubRepositoryTreeItem } from "../../../tree/registries/dockerHub/DockerHubRepositoryTreeItem";
import { DockerHubTagTreeItem } from "../../../tree/registries/dockerHub/DockerHubTagTreeItem";
import { openExternal } from "../../../utils/openExternal";

export async function openDockerHubInBrowser(context: IActionContext, node?: DockerHubNamespaceTreeItem | DockerHubRepositoryTreeItem | DockerHubTagTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<DockerHubNamespaceTreeItem>(DockerHubNamespaceTreeItem.contextValue, context);
    }

    let url = dockerHubUrl;
    if (node instanceof DockerHubNamespaceTreeItem) {
        url += `u/${node.namespace}`;
    } else if (node instanceof DockerHubRepositoryTreeItem) {
        url += `r/${node.parent.namespace}/${node.repoName}`;
    } else {
        url += `r/${node.parent.parent.namespace}/${node.parent.repoName}/tags`
    }

    await openExternal(url);
}
