/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestPromiseOptions } from "request-promise-native";
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { dockerHubUrl, PAGE_SIZE } from "../../../constants";
import { ext } from "../../../extensionVariables";
import { nonNullProp } from "../../../utils/nonNull";
import { registryRequest } from "../../../utils/registryRequestUtils";
import { getThemedIconPath } from "../../IconPath";
import { ICachedRegistryProvider } from "../ICachedRegistryProvider";
import { IRegistryProviderTreeItem } from "../IRegistryProviderTreeItem";
import { RegistryConnectErrorTreeItem } from "../RegistryConnectErrorTreeItem";
import { getRegistryContextValue, registryProviderSuffix } from "../registryContextValues";
import { getRegistryPassword } from "../registryPasswords";
import { DockerHubNamespaceTreeItem } from "./DockerHubNamespaceTreeItem";

export class DockerHubAccountTreeItem extends AzExtParentTreeItem implements IRegistryProviderTreeItem {
    public label: string = 'Docker Hub';
    public childTypeLabel: string = 'namespace';
    public baseUrl: string = dockerHubUrl;
    public cachedProvider: ICachedRegistryProvider;

    private _token?: string;
    private _nextLink?: string;

    public constructor(parent: AzExtParentTreeItem, cachedProvider: ICachedRegistryProvider) {
        super(parent);
        this.cachedProvider = cachedProvider;
        this.id = this.cachedProvider.id + this.username;
        this.iconPath = getThemedIconPath('docker');
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

        const url: string = this._nextLink ? this._nextLink : `v2/repositories/namespaces?page_size=${PAGE_SIZE}`;
        let response = await registryRequest<INamespaces>(this, 'GET', url);
        this._nextLink = response.body.next;
        return this.createTreeItemsWithErrorHandling(
            response.body.namespaces,
            'invalidDockerHubNamespace',
            n => new DockerHubNamespaceTreeItem(this, n.toLowerCase()),
            n => n
        );
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this._nextLink;
    }

    public async addAuth(options: RequestPromiseOptions): Promise<void> {
        if (this._token) {
            options.headers = {
                Authorization: 'JWT ' + this._token
            }
        }
    }

    private async refreshToken(): Promise<void> {
        this._token = undefined;
        const url = 'v2/users/login';
        const body = { username: this.username, password: await this.getPassword() };
        const response = await registryRequest<IToken>(this, 'POST', url, { body });
        this._token = response.body.token;
    }
}

interface IToken {
    token: string
}

interface INamespaces {
    namespaces: string[];
    next?: string;
}
