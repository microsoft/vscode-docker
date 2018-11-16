/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from "azure-arm-containerregistry/lib/models";
import * as vscode from "vscode";
import { DialogResponses } from "vscode-azureextensionui";
import { dockerExplorerProvider } from '../../dockerExtension';
import { AzureImageTagNode } from '../../explorer/models/azureRegistryNodes';
import { ext } from "../../extensionVariables";
import * as acrTools from '../../utils/Azure/acrTools';
import { AzureImage } from "../../utils/Azure/models/image";
import { Repository } from "../../utils/Azure/models/repository";
import * as quickPicks from '../utils/quick-pick-azure';

/** Function to untag an Azure hosted image
 * @param context : if called through right click on AzureImageNode, the node object will be passed in. See azureRegistryNodes.ts for more info
 */
export async function untagAzureImage(context?: AzureImageTagNode): Promise<void> {
    //await removeImage(context, true);
    let registry: Registry;
    let repo: Repository;
    let image: AzureImage;

    if (!context) {
        registry = await quickPicks.quickPickACRRegistry();
        repo = await quickPicks.quickPickACRRepository(registry, `Select the repository of the image you want to untag`);
        image = await quickPicks.quickPickACRImage(repo, `Select the image you want to untag`);

    } else {
        registry = context.registry;
        let wholeName: string[] = context.label.split(':');
        repo = await Repository.Create(registry, wholeName[0]);
        image = new AzureImage(repo, wholeName[1]);
    }

    const shouldDelete = await ext.ui.showWarningMessage(
        `Are you sure you want to untag: \'${image.toString()}\'? This does not delete the manifest referenced by the tag.`,
        { modal: true },
        DialogResponses.deleteResponse,
        DialogResponses.cancel);

    if (shouldDelete === DialogResponses.deleteResponse) {
        await acrTools.untagImage(image);
        vscode.window.showInformationMessage(`Successfully untagged: \'${image.toString()}\'`);

        if (context) {
            dockerExplorerProvider.refreshNode(context.parent);
        } else {
            dockerExplorerProvider.refreshRegistries();
        }
    }
}

/** Function to delete an Azure hosted image
 * @param context : if called through right click on AzureImageNode, the node object will be passed in. See azureRegistryNodes.ts for more info
 */
export async function deleteAzureImage(context?: AzureImageTagNode): Promise<void> {
    //await removeImage(context, false);
    let registry: Registry;
    let repo: Repository;
    let image: AzureImage;

    if (!context) {
        registry = await quickPicks.quickPickACRRegistry();
        repo = await quickPicks.quickPickACRRepository(registry, `Select the repository of the image you want to delete`);
        image = await quickPicks.quickPickACRImage(repo, `Select the image you want to delete`);

    } else {
        registry = context.registry;
        let wholeName: string[] = context.label.split(':');
        repo = await Repository.Create(registry, wholeName[0]);
        image = new AzureImage(repo, wholeName[1]);
    }

    const digest = await acrTools.getImageDigest(image);
    const images = await acrTools.getImagesByDigest(repo, digest);

    const shouldDelete = await ext.ui.showWarningMessage(
        `Are you sure you want to delete the manifest: '${digest}' and the associated image(s) ${images.join(', ')}?`,
        { modal: true },
        DialogResponses.deleteResponse,
        DialogResponses.cancel);

    if (shouldDelete === DialogResponses.deleteResponse) {
        await acrTools.deleteImage(repo, digest);
        vscode.window.showInformationMessage(`Successfully deleted manifest: ${digest}`);

        if (context) {
            dockerExplorerProvider.refreshNode(context.parent);
        } else {
            dockerExplorerProvider.refreshRegistries();
        }
    }
}
