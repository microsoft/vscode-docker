/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, contextValueExperience } from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";
import { ext } from "../../../extensionVariables";
import { UnifiedRegistryItem } from "../../../tree/registries/UnifiedRegistryTreeDataProvider";

export async function openDockerHubInBrowser(context: IActionContext, node?: UnifiedRegistryItem<unknown>): Promise<void> {
    if (!node) {
        node = await contextValueExperience(context, ext.registriesRoot, { include: 'dockerhubregistry' });
    }

    // let url = dockerHubUrl;
    // if (node instanceof DockerHubNamespaceTreeItem) {
    //     url += `u/${node.namespace}`;
    // } else if (node instanceof DockerHubRepositoryTreeItem) {
    //     url += `r/${node.parent.namespace}/${node.repoName}`;
    // } else {
    //     const repoTI = <DockerHubRepositoryTreeItem>node.parent;
    //     url += `r/${repoTI.parent.namespace}/${repoTI.repoName}/tags`;
    // }

    const url = '';
    // TODO: review this later

    await vscode.env.openExternal(vscode.Uri.parse(url));
}
