/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestPromiseOptions } from "request-promise-native";
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { nonNullProp } from "../../../utils/nonNull";
import { registryRequest } from "../../../utils/registryRequestUtils";
import { ICachedRegistryProvider } from "../ICachedRegistryProvider";
import { IRegistryProviderTreeItem } from "../IRegistryProviderTreeItem";
import { getRegistryContextValue, registryProviderSuffix, registrySuffix } from "../registryContextValues";
import { getRegistryPassword } from "../registryPasswords";
import { IDockerCliCredentials } from "../RegistryTreeItemBase";
import { DockerV2RegistryTreeItemBase } from "./DockerV2RegistryTreeItemBase";
import { DockerV2RepositoryTreeItem } from "./DockerV2RepositoryTreeItem";
import { addAccessToken, getWwwAuthenticateHeader, OAuthContext } from "./oAuthUtils";

export class GenericDockerV2RegistryTreeItem extends DockerV2RegistryTreeItemBase implements IRegistryProviderTreeItem {
    public cachedProvider: ICachedRegistryProvider;
    private _oAuthContext?: OAuthContext;

    public constructor(parent: AzExtParentTreeItem, provider: ICachedRegistryProvider) {
        super(parent);
        this.cachedProvider = provider;
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
                if ((this._oAuthContext = getWwwAuthenticateHeader(error))) {
                    // We got authentication context successfully--set scope and move on to requesting the items
                    this._oAuthContext.scope = 'registry:catalog:*';
                } else {
                    throw error;
                }
            }
        }

        return super.loadMoreChildrenImpl(clearCache, context);
    }

    public createRepositoryTreeItem(name: string): DockerV2RepositoryTreeItem {
        return new DockerV2RepositoryTreeItem(this, name, this.cachedProvider, this._oAuthContext);
    }

    public async addAuth(options: RequestPromiseOptions): Promise<void> {
        if (this._oAuthContext) {
            await addAccessToken(this.cachedProvider, this._oAuthContext, options);
        } else if (this.cachedProvider.username) {
            options.auth = {
                username: this.cachedProvider.username,
                password: await getRegistryPassword(this.cachedProvider)
            }
        }
    }

    public async getDockerCliCredentials(): Promise<IDockerCliCredentials> {
        const creds: IDockerCliCredentials = {
            registryPath: this.baseUrl
        };

        if (this.cachedProvider.username) {
            creds.auth = {
                username: this.cachedProvider.username,
                password: await getRegistryPassword(this.cachedProvider)
            };
        }

        return creds;
    }
}
