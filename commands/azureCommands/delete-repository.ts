/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from "azure-arm-containerregistry/lib/models";
import * as vscode from "vscode";
import { dockerExplorerProvider } from '../../dockerExtension';
import { AzureRepositoryNode } from '../../explorer/models/azureRegistryNodes';
import * as acrTools from '../../utils/Azure/acrTools';
import { Repository } from "../../utils/Azure/models/repository";
import { confirmUserIntent, quickPickACRRegistry, quickPickACRRepository } from '../utils/quick-pick-azure';

/**
 * function to delete an Azure repository and its associated images
 * @param context : if called through right click on AzureRepositoryNode, the node object will be passed in. See azureRegistryNodes.ts for more info
 */
export async function deleteRepository(context?: AzureRepositoryNode): Promise<void> {
    let registry: Registry;
    let repoName: string;

    if (context) {
        repoName = context.label;
        registry = context.registry;
    } else {
        registry = await quickPickACRRegistry();
        const repository: Repository = await quickPickACRRepository(registry, 'Select the repository you want to delete');
        repoName = repository.name;
    }
    const shouldDelete = await confirmUserIntent(`Are you sure you want to delete ${repoName} and its associated images? `);
    if (shouldDelete) {
        const { acrAccessToken } = await acrTools.acquireACRAccessTokenFromRegistry(registry, `repository:${repoName}:*`);
        const path = `/v2/_acr/${repoName}/repository`;
        await acrTools.sendRequestToRegistry('delete', registry.loginServer, path, acrAccessToken);
        vscode.window.showInformationMessage(`Successfully deleted repository ${repoName}`);
        if (context) {
            dockerExplorerProvider.refreshNode(context.parent);
        } else {
            dockerExplorerProvider.refreshRegistries();
        }
    }
}
