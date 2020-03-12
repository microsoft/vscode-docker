/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { nonNullProp } from "../../../utils/nonNull";
import { registryRequest } from "../../../utils/registryRequestUtils";
import { IAuthHelper } from "../auth/IAuthHelper";
import { getWwwAuthenticateHeader } from "../auth/oAuthUtils";
import { ICachedRegistryProvider } from "../ICachedRegistryProvider";
import { getRegistryContextValue, registryProviderSuffix, registrySuffix } from "../registryContextValues";
import { DockerV2RegistryTreeItemBase } from "./DockerV2RegistryTreeItemBase";
import { DockerV2RepositoryTreeItem } from "./DockerV2RepositoryTreeItem";

export class GenericDockerV2RegistryTreeItem extends DockerV2RegistryTreeItemBase {
    public constructor(parent: AzExtParentTreeItem, cachedProvider: ICachedRegistryProvider, authHelper: IAuthHelper) {
        super(parent, cachedProvider, authHelper);
    }

    public get contextValue(): string {
        return getRegistryContextValue(this, registrySuffix, registryProviderSuffix);
    }

    public get label(): string {
        return this.host;
    }

    public get id(): string {
        return this.baseUrl;
    }

    public get baseUrl(): string {
        return nonNullProp(this.cachedProvider, 'url');
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            try {
                // If the call succeeds, it's a V2 registry (https://docs.docker.com/registry/spec/api/#api-version-check)
                // NOTE: Trailing slash is necessary (https://github.com/microsoft/vscode-docker/issues/1142)
                await registryRequest(this, 'GET', 'v2/');
            } catch (error) {
                if ((this.authContext = getWwwAuthenticateHeader(error))) {
                    // We got authentication context successfully--set scope and move on to requesting the items
                    this.authContext.scope = 'registry:catalog:*';
                } else {
                    throw error;
                }
            }
        }

        return super.loadMoreChildrenImpl(clearCache, context);
    }

    public createRepositoryTreeItem(name: string): DockerV2RepositoryTreeItem {
        return new DockerV2RepositoryTreeItem(this, name, this.cachedProvider, this.authHelper, this.authContext);
    }
}
