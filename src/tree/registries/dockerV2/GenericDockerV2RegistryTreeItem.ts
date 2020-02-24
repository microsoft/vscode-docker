/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestPromiseOptions } from "request-promise-native";
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext, parseError } from "vscode-azureextensionui";
import { nonNullProp } from "../../../utils/nonNull";
import { registryRequest } from "../../../utils/registryRequestUtils";
import { ICachedRegistryProvider } from "../ICachedRegistryProvider";
import { IRegistryProviderTreeItem } from "../IRegistryProviderTreeItem";
import { RegistryConnectErrorTreeItem } from "../RegistryConnectErrorTreeItem";
import { getRegistryContextValue, registryProviderSuffix, registrySuffix } from "../registryContextValues";
import { getRegistryPassword } from "../registryPasswords";
import { IDockerCliCredentials } from "../RegistryTreeItemBase";
import { DockerV2RegistryTreeItemBase } from "./DockerV2RegistryTreeItemBase";
import { DockerV2RepositoryTreeItem } from "./DockerV2RepositoryTreeItem";

export class GenericDockerV2RegistryTreeItem extends DockerV2RegistryTreeItemBase implements IRegistryProviderTreeItem {
    public cachedProvider: ICachedRegistryProvider;

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
                const errorType: string = parseError(error).errorType.toLowerCase();
                if (errorType === "401" || errorType === "unauthorized") {
                    const message = 'Incorrect login credentials, or this registry may not support basic authentication. Please note that OAuth support has not yet been implemented in this preview feature.';
                    return [new RegistryConnectErrorTreeItem(this, new Error(message), this.cachedProvider, this.baseUrl)];
                } else {
                    throw error;
                }
            }
        }

        return super.loadMoreChildrenImpl(clearCache, context);
    }

    public createRepositoryTreeItem(name: string): DockerV2RepositoryTreeItem {
        return new DockerV2RepositoryTreeItem(this, name);
    }

    public async addAuth(options: RequestPromiseOptions): Promise<void> {
        if (this.cachedProvider.username) {
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
