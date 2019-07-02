/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestPromiseOptions } from "request-promise-native";
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { PAGE_SIZE } from "../../../constants";
import { getNextLinkFromHeaders, registryRequest } from "../../../utils/registryRequestUtils";
import { getIconPath, IconPath } from "../../IconPath";
import { ICachedRegistryProvider } from "../ICachedRegistryProvider";
import { IRegistryProviderTreeItem } from "../IRegistryProviderTreeItem";
import { getRegistryContextValue, registryProviderSuffix } from "../registryContextValues";
import { getRegistryPassword } from "../registryPasswords";
import { GitLabProjectTreeItem } from "./GitLabProjectTreeItem";

export class GitLabAccountTreeItem extends AzExtParentTreeItem implements IRegistryProviderTreeItem {
    public label: string = 'GitLab';
    public childTypeLabel: string = 'project';
    public baseUrl: string = 'https://gitlab.com/';
    public cachedProvider: ICachedRegistryProvider;

    private _nextLink?: string;

    public constructor(parent: AzExtParentTreeItem, provider: ICachedRegistryProvider) {
        super(parent);
        this.cachedProvider = provider;
    }

    public get contextValue(): string {
        return getRegistryContextValue(this, registryProviderSuffix);
    }

    public get iconPath(): IconPath {
        return getIconPath('gitLab');
    }

    public async loadMoreChildrenImpl(clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const url: string = this._nextLink || `api/v4/projects?per_page=${PAGE_SIZE}&simple=true&membership=true`;
        let response = await registryRequest<IProject[]>(this, 'GET', url);
        this._nextLink = getNextLinkFromHeaders(response);
        return this.createTreeItemsWithErrorHandling(
            response.body,
            'invalidGitLabProject',
            n => new GitLabProjectTreeItem(this, n.id.toString(), n.path_with_namespace),
            n => n.path_with_namespace
        );
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this._nextLink;
    }

    public async addAuth(options: RequestPromiseOptions): Promise<void> {
        options.headers = {
            "Private-Token": await getRegistryPassword(this.cachedProvider)
        }
    }
}

interface IProject {
    id: number;
    path_with_namespace: string;
}
