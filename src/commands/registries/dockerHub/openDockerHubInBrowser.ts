/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";
import { dockerHubUrl } from "../../../constants";
import { ext } from "../../../extensionVariables";
import { DockerHubNamespaceTreeItem } from "../../../tree/registries/dockerHub/DockerHubNamespaceTreeItem";
import { DockerHubRepositoryTreeItem } from "../../../tree/registries/dockerHub/DockerHubRepositoryTreeItem";
import { registryExpectedContextValues } from "../../../tree/registries/registryContextValues";
import { RemoteTagTreeItem } from "../../../tree/registries/RemoteTagTreeItem";

export async function openDockerHubInBrowser(context: IActionContext, node?: DockerHubNamespaceTreeItem | DockerHubRepositoryTreeItem | RemoteTagTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<DockerHubNamespaceTreeItem>(registryExpectedContextValues.dockerHub.registry, {
            ...context,
            noItemFoundErrorMessage: vscode.l10n.t('No Docker Hub registries available to browse')
        });
    }

    let url = dockerHubUrl;
    if (node instanceof DockerHubNamespaceTreeItem) {
        url += `u/${node.namespace}`;
    } else if (node instanceof DockerHubRepositoryTreeItem) {
        url += `r/${node.parent.namespace}/${node.repoName}`;
    } else {
        const repoTI = <DockerHubRepositoryTreeItem>node.parent;
        url += `r/${repoTI.parent.namespace}/${repoTI.repoName}/tags`;
    }

    await vscode.env.openExternal(vscode.Uri.parse(url));
}
