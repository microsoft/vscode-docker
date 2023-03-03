/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, nonNullProp } from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";
import { ext } from "../../extensionVariables";
import { AzureTaskRunTreeItem } from "../../tree/registries/azure/AzureTaskRunTreeItem";
import { DockerV2TagTreeItem } from "../../tree/registries/dockerV2/DockerV2TagTreeItem";
import { registryExpectedContextValues } from "../../tree/registries/registryContextValues";

export async function copyRemoteImageDigest(context: IActionContext, node?: DockerV2TagTreeItem | AzureTaskRunTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<DockerV2TagTreeItem>(registryExpectedContextValues.dockerV2.tag, {
            ...context,
            noItemFoundErrorMessage: vscode.l10n.t('No remote images are available to copy the digest')
        });
    }

    let digest: string;
    if (node instanceof AzureTaskRunTreeItem) {
        if (node.outputImage) {
            digest = nonNullProp(node.outputImage, 'digest');
        } else {
            throw new Error(vscode.l10n.t('Failed to find output image for this task run.'));
        }
    } else {
        await node.runWithTemporaryDescription(context, vscode.l10n.t('Getting digest...'), async () => {
            digest = await (<DockerV2TagTreeItem>node).getDigest();
        });
    }

    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    vscode.env.clipboard.writeText(digest);
}
