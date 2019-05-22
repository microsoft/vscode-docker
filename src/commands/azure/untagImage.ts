/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from "azure-arm-containerregistry/lib/models";
import * as vscode from "vscode";
import { DialogResponses, IActionContext } from "vscode-azureextensionui";
import { AzureImageTagNode } from '../../../explorer/models/azureRegistryNodes';
import { ext } from "../../extensionVariables";
import * as acrTools from '../../utils/Azure/acrTools';
import { AzureImage } from "../../utils/Azure/models/AzureImage";
import { AzureRepository } from "../../utils/Azure/models/AzureRepository";
import * as quickPicks from '../../utils/quick-pick-azure';

/** Function to untag an Azure hosted image
 * @param node : if called through right click on AzureImageNode, the node object will be passed in. See azureRegistryNodes.ts for more info
 */
export async function untagImage(_context: IActionContext, node?: AzureImageTagNode): Promise<void> {
    let registry: Registry;
    let repo: AzureRepository;
    let image: AzureImage;

    if (!node) {
        registry = await quickPicks.quickPickACRRegistry();
        repo = await quickPicks.quickPickACRRepository(registry, `Select the repository of the image you want to untag`);
        image = await quickPicks.quickPickACRImage(repo, `Select the image you want to untag`);

    } else {
        registry = node.registry;
        let wholeName: string[] = node.label.split(':');
        repo = await AzureRepository.Create(registry, wholeName[0]);
        image = new AzureImage(repo, wholeName[1]);
    }

    const untag: vscode.MessageItem = { title: "Untag" };
    const shouldDelete = await ext.ui.showWarningMessage(
        `Are you sure you want to untag '${image.toString()}'? This does not delete the manifest referenced by the tag.`,
        { modal: true },
        untag,
        DialogResponses.cancel);

    if (shouldDelete === untag) {
        await acrTools.untagImage(image);
        vscode.window.showInformationMessage(`Successfully untagged '${image.toString()}'`);

        if (node) {
            ext.dockerExplorerProvider.refreshNode(node.parent);
        } else {
            ext.dockerExplorerProvider.refreshRegistries();
        }
    }
}
