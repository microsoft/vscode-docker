/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as request from "request-promise-native";
import { URL } from "url";
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { PAGE_SIZE } from "../../../constants";
import { getNextLinkFromHeaders, registryRequest } from "../../../utils/registryRequestUtils";
import { IAuthProvider, IOAuthContext } from "../auth/IAuthProvider";
import { ICachedRegistryProvider } from "../ICachedRegistryProvider";
import { IRegistryProviderTreeItem } from "../IRegistryProviderTreeItem";
import { IDockerCliCredentials, RegistryTreeItemBase } from "../RegistryTreeItemBase";
import { RemoteRepositoryTreeItemBase } from "../RemoteRepositoryTreeItemBase";

export abstract class DockerV2RegistryTreeItemBase extends RegistryTreeItemBase implements IRegistryProviderTreeItem {
    protected authContext?: IOAuthContext;

    private _nextLink: string | undefined;

    public constructor(parent: AzExtParentTreeItem, public readonly cachedProvider: ICachedRegistryProvider, protected readonly authHelper: IAuthProvider) {
        super(parent);
    }

    public get baseImagePath(): string {
        const url = new URL(this.baseUrl);

        // Return URL host + pathname, removing any trailing slash and forcing lower case
        // e.g. https://myRegistryUrl.tld:1234/NameSpace/ becomes myregistryurl.tld:1234/namespace
        // e.g. https://myRegistryUrl.tld:1234/ becomes myregistryurl.tld:1234
        return `${url.host}${url.pathname}`.replace(/\/$/i, '').toLowerCase();
    }

    public get host(): string {
        return new URL(this.baseUrl).host;
    }

    public abstract createRepositoryTreeItem(name: string): RemoteRepositoryTreeItemBase;

    public async loadMoreChildrenImpl(clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        let url = this._nextLink || `v2/_catalog?n=${PAGE_SIZE}`;
        let response = await registryRequest<IRepositories>(this, 'GET', url);
        this._nextLink = getNextLinkFromHeaders(response);
        return await this.createTreeItemsWithErrorHandling(
            response.body.repositories,
            'invalidRepository',
            r => this.createRepositoryTreeItem(r),
            r => r
        );
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this._nextLink;
    }

    public async addAuth(options: request.RequestPromiseOptions): Promise<void> {
        if (this.authHelper) {
            options.auth = await this.authHelper.getAuthOptions(this.cachedProvider, this.authContext);
        }
    }

    public async getDockerCliCredentials(): Promise<IDockerCliCredentials> {
        if (this.authHelper) {
            return await this.authHelper.getDockerCliCredentials(this.cachedProvider, this.authContext);
        }

        return undefined;
    }
}

interface IRepositories {
    repositories: string[];
}
