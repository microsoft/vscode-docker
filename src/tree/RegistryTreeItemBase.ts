/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestPromiseOptions } from "request-promise-native";
import { URL } from "url";
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { PAGE_SIZE } from "../constants";
import { getNextLinkFromHeaders, registryRequest } from "../utils/registryRequestUtils";
import { treeUtils } from "../utils/treeUtils";
import { RemoteRepositoryTreeItemBase } from "./RemoteRepositoryTreeItemBase";

export abstract class RegistryTreeItemBase extends AzExtParentTreeItem {
    public static contextValueSuffix: string = 'Registry';
    public static allContextRegExp: RegExp = /Registry$/;
    public childTypeLabel: string = 'repository';

    protected _nextLink: string | undefined;

    public get iconPath(): treeUtils.IThemedIconPath | string {
        return treeUtils.getThemedIconPath('registry');
    }

    public abstract baseUrl: string;
    public abstract addAuth(options: RequestPromiseOptions): Promise<void>;
    public abstract createRepositoryTreeItem(name: string): RemoteRepositoryTreeItemBase;

    public get host(): string {
        return new URL(this.baseUrl).host;
    }

    public async loadMoreChildrenImpl(clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const repos = await this.getRepositories();
        return await this.createTreeItemsWithErrorHandling(
            repos,
            'invalidRepository',
            r => this.createRepositoryTreeItem(r),
            r => r
        );
    }

    public async getRepositories(): Promise<string[]> {
        let url = this._nextLink || `v2/_catalog?n=${PAGE_SIZE}`;
        let response = await registryRequest<IRepositories>(this, 'GET', url);
        this._nextLink = getNextLinkFromHeaders(response);
        return response.body.repositories;
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this._nextLink;
    }
}

interface IRepositories {
    repositories: string[];
}
