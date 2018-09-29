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
    removeImage(context, true);
}

/** Function to delete an Azure hosted image
 * @param context : if called through right click on AzureImageNode, the node object will be passed in. See azureRegistryNodes.ts for more info
 */
export async function deleteAzureImage(context?: AzureImageTagNode): Promise<void> {
    removeImage(context, false);
}

/** Function to delete an Azure hosted image
 * @param context : if called through right click on AzureImageNode, the node object will be passed in. See azureRegistryNodes.ts for more info
 * @param untag : if true deletes the image tag, otherwise removes digest and all other tags associeted to the image selected.
 */
async function removeImage(context: AzureImageTagNode, untag: boolean): Promise<boolean> {
    let action: string = (untag) ? "untag" : "delete";
    let registry: Registry;
    let repo: Repository;
    let image: AzureImage;

    if (!context) {
        registry = await quickPicks.quickPickACRRegistry();
        repo = await quickPicks.quickPickACRRepository(registry, `Select the repository of the image you want to ${action}`);
        image = await quickPicks.quickPickACRImage(repo, `Select the image you want to ${action}`);

    } else {
        registry = context.registry;
        let wholeName: string[] = context.label.split(':');
        repo = new Repository(registry, wholeName[0]);
        image = new AzureImage(repo, wholeName[1]);
    }

    let message: string;
    let path: string;
    let digest: string;
    if (untag) {
        message = `Are you sure you want to untag: \'${image.toString()}\'? This does not delete the manifest referenced by the tag.`;
        path = `/v2/_acr/${repo.name}/tags/${image.tag}`;
    } else {
        digest = await acrTools.getImageDigest(image);
        let images = await acrTools.getImagesByDigest(repo, digest);
        message = `Are you sure you want to delete the manifest: '${digest}' and the associated image(s) ${images.toString()}? `;
        path = `/v2/${repo.name}/manifests/${digest}`;
    }

    const shouldDelete = await ext.ui.showWarningMessage(message, { modal: true }, DialogResponses.deleteResponse, DialogResponses.cancel);
    if (shouldDelete === DialogResponses.deleteResponse) {
        const { acrAccessToken } = await acrTools.acquireACRAccessTokenFromRegistry(registry, `repository:${repo.name}:*`);
        await acrTools.sendRequestToRegistry('delete', registry.loginServer, path, acrAccessToken);
        if (untag) {
            vscode.window.showInformationMessage(`Successfully untagged: \'${image.toString()}\'`);
        } else {
            vscode.window.showInformationMessage(`Successfully deleted manifest: ${digest}`);
        }
        if (context) {
            dockerExplorerProvider.refreshNode(context.parent);
        } else {
            dockerExplorerProvider.refreshRegistries();
        }
    }
    return true;
}
