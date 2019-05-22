/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from "azure-arm-containerregistry/lib/models";
import * as vscode from "vscode";
import { DialogResponses, IActionContext } from "vscode-azureextensionui";
import { AzureImageTagNode } from '../../explorer/models/azureRegistryNodes';
import { ext } from "../../extensionVariables";
import * as acrTools from '../../src/utils/Azure/acrTools';
import { AzureImage } from "../../src/utils/Azure/models/image";
import { Repository } from "../../src/utils/Azure/models/repository";
import * as quickPicks from '../utils/quick-pick-azure';

/** Function to untag an Azure hosted image
 * @param node : if called through right click on AzureImageNode, the node object will be passed in. See azureRegistryNodes.ts for more info
 */
export async function untagAzureImage(_context: IActionContext, node?: AzureImageTagNode): Promise<void> {
    let registry: Registry;
    let repo: Repository;
    let image: AzureImage;

    if (!node) {
        registry = await quickPicks.quickPickACRRegistry();
        repo = await quickPicks.quickPickACRRepository(registry, `Select the repository of the image you want to untag`);
        image = await quickPicks.quickPickACRImage(repo, `Select the image you want to untag`);

    } else {
        registry = node.registry;
        let wholeName: string[] = node.label.split(':');
        repo = await Repository.Create(registry, wholeName[0]);
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

/** Function to delete an Azure hosted image
 * @param node : if called through right click on AzureImageNode, the node object will be passed in. See azureRegistryNodes.ts for more info
 */
export async function deleteAzureImage(_context: IActionContext, node?: AzureImageTagNode): Promise<void> {
    let registry: Registry;
    let repo: Repository;
    let image: AzureImage;

    if (!node) {
        registry = await quickPicks.quickPickACRRegistry();
        repo = await quickPicks.quickPickACRRepository(registry, `Select the repository of the image you want to delete `);
        image = await quickPicks.quickPickACRImage(repo, `Select the image you want to delete `);

    } else {
        registry = node.registry;
        let wholeName: string[] = node.label.split(':');
        repo = await Repository.Create(registry, wholeName[0]);
        image = new AzureImage(repo, wholeName[1]);
    }

    const digest = await acrTools.getImageDigest(image);
    const images = await acrTools.getImagesByDigest(repo, digest);
    const imageList = images.join(', ');

    const shouldDelete = await ext.ui.showWarningMessage(
        `Are you sure you want to delete the manifest '${digest}' and the associated image(s): ${imageList}?`,
        { modal: true },
        DialogResponses.deleteResponse,
        DialogResponses.cancel);

    if (shouldDelete === DialogResponses.deleteResponse) {
        await acrTools.deleteImage(repo, digest);
        vscode.window.showInformationMessage(`Successfully deleted manifest '${digest}' and the associated image(s): ${imageList}.`);

        if (node) {
            ext.dockerExplorerProvider.refreshNode(node.parent);
        } else {
            ext.dockerExplorerProvider.refreshRegistries();
        }
    }
}
