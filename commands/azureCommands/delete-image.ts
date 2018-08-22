/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from "azure-arm-containerregistry/lib/models";
import * as vscode from "vscode";
import { dockerExplorerProvider } from '../../dockerExtension';
import { AzureImageNode } from '../../explorer/models/azureRegistryNodes';
import * as acrTools from '../../utils/Azure/acrTools';
import { AzureImage } from "../../utils/Azure/models/image";
import { Repository } from "../../utils/Azure/models/repository";
import * as quickPicks from '../utils/quick-pick-azure';

/** Function to delete an Azure hosted image
 * @param context : if called through right click on AzureImageNode, the node object will be passed in. See azureRegistryNodes.ts for more info
 */
export async function deleteAzureImage(context?: AzureImageNode): Promise<void> {
    let registry: Registry;
    let repoName: string;
    let tag: string;

    if (!context) {
        registry = await quickPicks.quickPickACRRegistry();
        const repository: Repository = await quickPicks.quickPickACRRepository(registry, 'Choose the repository of the image you want to delete');
        repoName = repository.name;
        const image: AzureImage = await quickPicks.quickPickACRImage(repository, 'Choose the image you want to delete');
        tag = image.tag;

    } else {
        registry = context.registry;
        let wholeName: string[] = context.label.split(':');
        repoName = wholeName[0];
        tag = wholeName[1];
    }

    const shouldDelete = await quickPicks.confirmUserIntent(`Are you sure you want to delete ${repoName}:${tag}? Enter yes to continue: `);
    if (shouldDelete) {
        const { acrAccessToken } = await acrTools.acquireACRAccessTokenFromRegistry(registry, `repository:${repoName}:*`);
        const path = `/v2/_acr/${repoName}/tags/${tag}`;
        await acrTools.sendRequestToRegistry('delete', registry.loginServer, path, acrAccessToken);
        vscode.window.showInformationMessage(`Successfully deleted image ${tag}`);
        if (context) {
            dockerExplorerProvider.refreshNode(context.parent);
        }
    }
}
