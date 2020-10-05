/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestPromiseOptions } from "request-promise-native";
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { PAGE_SIZE } from "../../../constants";
import { ext } from "../../../extensionVariables";
import { nonNullProp } from "../../../utils/nonNull";
import { getNextLinkFromHeaders, registryRequest } from "../../../utils/registryRequestUtils";
import { getIconPath } from "../../IconPath";
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

    private _token?: string;
    private _nextLink?: string;

    public constructor(parent: AzExtParentTreeItem, provider: ICachedRegistryProvider) {
        super(parent);
        this.cachedProvider = provider;
        this.id = this.cachedProvider.id + this.username;
        this.iconPath = getIconPath('gitLab');
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

    public async loadMoreChildrenImpl(clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;

            try {
                await this.refreshToken();
            } catch (err) {
                // If creds are invalid, the above refreshToken will fail
                return [new RegistryConnectErrorTreeItem(this, err, this.cachedProvider)];
            }
        }

        const url: string = this._nextLink || `api/v4/projects?per_page=${PAGE_SIZE}&simple=true&membership=true`;
        let response = await registryRequest<IProject[]>(this, 'GET', url);
        this._nextLink = getNextLinkFromHeaders(response);
        return this.createTreeItemsWithErrorHandling(
            response.body,
            'invalidGitLabProject',
            n => new GitLabProjectTreeItem(this, n.id.toString(), n.path_with_namespace.toLowerCase()),
            n => n.path_with_namespace
        );
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this._nextLink;
    }

    public async addAuth(options: RequestPromiseOptions): Promise<void> {
        if (this._token) {
            options.auth = {
                bearer: this._token
            }
        }
    }

    private async refreshToken(): Promise<void> {
        this._token = undefined;
        const options = {
            form: {
                /* eslint-disable-next-line camelcase */
                grant_type: "password",
                username: this.username,
                password: await this.getPassword()
            }
        };

        const response = await registryRequest<IToken>(this, 'POST', 'oauth/token', options);
        this._token = response.body.access_token;
    }
}

interface IProject {
    id: number;
    /* eslint-disable-next-line camelcase */
    path_with_namespace: string;
}

interface IToken {
    /* eslint-disable-next-line camelcase */
    access_token: string
}
