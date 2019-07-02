/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Response } from "request";
import { RequestPromiseOptions } from "request-promise-native";
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext, parseError } from "vscode-azureextensionui";
import { nonNullProp } from "../../../utils/nonNull";
import { registryRequest } from "../../../utils/registryRequestUtils";
import { ICachedRegistryProvider } from "../ICachedRegistryProvider";
import { IRegistryProviderTreeItem } from "../IRegistryProviderTreeItem";
import { getRegistryContextValue, registryProviderSuffix, registrySuffix } from "../registryContextValues";
import { getRegistryPassword } from "../registryPasswords";
import { IDockerCliCredentials } from "../RegistryTreeItemBase";
import { DockerV2RegistryTreeItemBase } from "./DockerV2RegistryTreeItemBase";
import { DockerV2RepositoryTreeItem } from "./DockerV2RepositoryTreeItem";

export class GenericDockerV2RegistryTreeItem extends DockerV2RegistryTreeItemBase implements IRegistryProviderTreeItem {
    public cachedProvider: ICachedRegistryProvider;
    private _token?: string;

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
            this._token = undefined;

            try {
                // If the call succeeds, it's a V2 registry (https://docs.docker.com/registry/spec/api/#api-version-check)
                // NOTE: Trailing slash is necessary (https://github.com/microsoft/vscode-docker/issues/1142)
                await registryRequest(this, 'GET', 'v2/');
            } catch (error) {
                const header = getWwwAuthenticateHeader(error);
                if (header) {
                    await this.refreshToken(header);
                    await registryRequest(this, 'GET', 'v2');
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
        if (this._token) {
            options.headers = {
                Authorization: 'Bearer ' + this._token
            }
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

    private async refreshToken(header: string): Promise<void> {
        this._token = undefined;
        const options = {
            baseUrl: getAuthHeaderPart(header, 'realm'),
            form: {
                grant_type: "password",
                client_id: 'docker',
                service: getAuthHeaderPart(header, 'service'),
                scope: getAuthHeaderPart(header, 'scope'),
                offline_token: true
            },
            headers: {
                "Content-Type": 'application/x-www-form-urlencoded'
            }
        };

        const response = await registryRequest<IToken>(this, 'GET', '', options);
        this._token = response.body.token;
    }
}

interface IToken {
    token: string
}

function getWwwAuthenticateHeader(error: unknown): string | undefined {
    const errorType = parseError(error).errorType;
    if (errorType === "401" || errorType.toLowerCase() === 'unauthorized') {
        const response = error && typeof error === 'object' && (<{ response?: Response }>error).response;
        const header = response && typeof response === 'object' && response.headers && response.headers['www-authenticate'];
        return header;
    }

    return undefined;
}

function getAuthHeaderPart(authHeader: string, part: string): string | undefined {
    const match = authHeader.match(new RegExp(`${part}="([^"]*)"`, 'i'));
    return match ? match[1] : undefined;
}
