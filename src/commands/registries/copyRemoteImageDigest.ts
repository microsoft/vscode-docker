/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { AzureTaskRunTreeItem } from "../../tree/registries/azure/AzureTaskRunTreeItem";
import { DockerV2TagTreeItem } from "../../tree/registries/dockerV2/DockerV2TagTreeItem";
import { registryExpectedContextValues } from "../../tree/registries/registryContextValues";
import { nonNullProp } from "../../utils/nonNull";

export async function copyRemoteImageDigest(context: IActionContext, node?: DockerV2TagTreeItem | AzureTaskRunTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<DockerV2TagTreeItem>(registryExpectedContextValues.dockerV2.tag, {
            ...context,
            noItemFoundErrorMessage: localize('vscode-docker.commands.registries.copyRemote.noImages', 'No remote images are available to copy the digest')
        });
    }

    let digest: string;
    if (node instanceof AzureTaskRunTreeItem) {
        if (node.outputImage) {
            digest = nonNullProp(node.outputImage, 'digest');
        } else {
            throw new Error(localize('vscode-docker.commands.registries.copyRemote.noOutputImage', 'Failed to find output image for this task run.'));
        }
    } else {
        await node.runWithTemporaryDescription(context, localize('vscode-docker.commands.registries.copyRemote.gettingDigest', 'Getting digest...'), async () => {
            digest = await (<DockerV2TagTreeItem>node).getDigest();
        });
    }

    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    vscode.env.clipboard.writeText(digest);
}
