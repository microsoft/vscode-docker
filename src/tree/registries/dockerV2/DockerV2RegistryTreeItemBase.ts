/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URL } from "url";
import { AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { PAGE_SIZE } from "../../../constants";
import { getNextLinkFromHeaders, registryRequest } from "../../../utils/registryRequestUtils";
import { RegistryTreeItemBase } from "../RegistryTreeItemBase";
import { RemoteRepositoryTreeItemBase } from "../RemoteRepositoryTreeItemBase";

export abstract class DockerV2RegistryTreeItemBase extends RegistryTreeItemBase {
    private _nextLink: string | undefined;

    public get baseImagePath(): string {
        return this.host;
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
}

interface IRepositories {
    repositories: string[];
}
