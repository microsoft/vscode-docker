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

/** Function to delete an Azure hosted image
 * @param context : if called through right click on AzureImageNode, the node object will be passed in. See azureRegistryNodes.ts for more info
 */
export async function deleteAzureImage(context?: AzureImageTagNode): Promise<void> {
    let registry: Registry;
    let repoName: string;
    let tag: string;

    if (!context) {
        registry = await quickPicks.quickPickACRRegistry();
        const repository: Repository = await quickPicks.quickPickACRRepository(registry, 'Select the repository of the image you want to delete');
        repoName = repository.name;
        const image: AzureImage = await quickPicks.quickPickACRImage(repository, 'Select the image you want to delete');
        tag = image.tag;

    } else {
        registry = context.registry;
        let wholeName: string[] = context.label.split(':');
        repoName = wholeName[0];
        tag = wholeName[1];
    }

    const shouldDelete = await ext.ui.showWarningMessage(`Are you sure you want to delete ${repoName}:${tag}? `, { modal: true }, DialogResponses.deleteResponse, DialogResponses.cancel);
    if (shouldDelete === DialogResponses.deleteResponse) {
        const { acrAccessToken } = await acrTools.acquireACRAccessTokenFromRegistry(registry, `repository:${repoName}:*`);
        const path = `/v2/_acr/${repoName}/tags/${tag}`;
        await acrTools.sendRequestToRegistry('delete', registry.loginServer, path, acrAccessToken);
        vscode.window.showInformationMessage(`Successfully deleted image ${tag}`);
        if (context) {
            dockerExplorerProvider.refreshNode(context.parent);
        } else {
            dockerExplorerProvider.refreshRegistries();
        }
    }
}
