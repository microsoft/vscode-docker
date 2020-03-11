/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { registryRequest } from "../../../utils/registryRequestUtils";
import { IAzureOAuthContext } from "../auth/AzureOAuthHelper";
import { IOAuthContext } from "../auth/IAuthHelper";
import { DockerV2RepositoryTreeItem } from "../dockerV2/DockerV2RepositoryTreeItem";
import { ICachedRegistryProvider } from "../ICachedRegistryProvider";
import { IRegistryProvider } from "../IRegistryProvider";
import { AzureRegistryTreeItem } from "./AzureRegistryTreeItem";

export class AzureRepositoryTreeItem extends DockerV2RepositoryTreeItem {
    public parent: AzureRegistryTreeItem;

    protected authContext?: IAzureOAuthContext;

    public constructor(parent: AzureRegistryTreeItem, repoName: string, provider: IRegistryProvider, cachedProvider: ICachedRegistryProvider, authContext?: IOAuthContext) {
        super(parent, repoName, provider, cachedProvider, authContext);
    }

    public async deleteTreeItemImpl(): Promise<void> {
        await registryRequest(this, 'DELETE', `v2/_acr/${this.repoName}/repository`);
    }
}
