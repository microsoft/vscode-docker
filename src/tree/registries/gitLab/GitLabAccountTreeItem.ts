/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, IActionContext, nonNullProp, parseError } from "@microsoft/vscode-azext-utils";
import { PAGE_SIZE } from "../../../constants";
import { ext } from "../../../extensionVariables";
import { RequestLike } from "../../../utils/httpRequest";
import { getNextLinkFromHeaders, registryRequest } from "../../../utils/registryRequestUtils";
import { getIconPath } from "../../getThemedIconPath";
import { ICachedRegistryProvider } from "../ICachedRegistryProvider";
import { IRegistryProviderTreeItem } from "../IRegistryProviderTreeItem";
import { RegistryConnectErrorTreeItem } from "../RegistryConnectErrorTreeItem";
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
        this.id = this.cachedProvider.id + this.username;
        this.iconPath = getIconPath('gitlab');
        this.description = ext.registriesRoot.hasMultiplesOfProvider(this.cachedProvider) ? this.username : undefined;
    }

    public get contextValue(): string {
        return getRegistryContextValue(this, registryProviderSuffix);
    }

    public get username(): string {
        return nonNullProp(this.cachedProvider, 'username');
    }

    public async getPassword(): Promise<string> {
        return await getRegistryPassword(this.cachedProvider);
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        try {
            const url: string = this._nextLink || `api/v4/projects?per_page=${PAGE_SIZE}&simple=true&membership=true`;
            const response = await registryRequest<IProject[]>(this, 'GET', url);
            this._nextLink = getNextLinkFromHeaders(response);
            return this.createTreeItemsWithErrorHandling(
                response.body,
                'invalidGitLabProject',
                n => new GitLabProjectTreeItem(this, n.id.toString(), n.path_with_namespace.toLowerCase()),
                n => n.path_with_namespace
            );
        } catch (err) {
            const errorType: string = parseError(err).errorType.toLowerCase();
            if (errorType === '401' || errorType === 'unauthorized') {
                return [new RegistryConnectErrorTreeItem(this, err, this.cachedProvider)];
            } else {
                throw err;
            }
        }
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this._nextLink;
    }

    public async signRequest(request: RequestLike): Promise<RequestLike> {
        request.headers.set('PRIVATE-TOKEN', await this.getPassword());
        return request;
    }
}

interface IProject {
    id: number;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    path_with_namespace: string;
}
