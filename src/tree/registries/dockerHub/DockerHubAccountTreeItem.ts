/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { dockerHubUrl } from "../../../constants";
import { ext } from "../../../extensionVariables";
import { RequestLike, bearerAuthHeader } from "../../../utils/httpRequest";
import { nonNullProp } from "../../../utils/nonNull";
import { registryRequest } from "../../../utils/registryRequestUtils";
import { getThemedIconPath } from "../../getThemedIconPath";
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

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            try {
                await this.refreshToken();
            } catch (err) {
                // If creds are invalid, the above refreshToken will fail
                return [new RegistryConnectErrorTreeItem(this, err, this.cachedProvider)];
            }
        }

        const orgsAndNamespaces = new Set<string>();

        for (const orgs of await this.getOrganizations()) {
            orgsAndNamespaces.add(orgs);
        }

        for (const namespaces of await this.getNamespaces()) {
            orgsAndNamespaces.add(namespaces);
        }

        return this.createTreeItemsWithErrorHandling(
            Array.from(orgsAndNamespaces),
            'invalidDockerHubNamespace',
            n => new DockerHubNamespaceTreeItem(this, n.toLowerCase()),
            n => n
        );
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async signRequest(request: RequestLike): Promise<RequestLike> {
        if (this._token) {
            request.headers.set('Authorization', bearerAuthHeader(this._token));
        }

        return request;
    }

    private async refreshToken(): Promise<void> {
        this._token = undefined;
        const url = 'v2/users/login';
        const body = { username: this.username, password: await this.getPassword() };
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const response = await registryRequest<IToken>(this, 'POST', url, { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
        this._token = response.body.token;
    }

    private async getNamespaces(): Promise<string[]> {
        const url: string = `v2/repositories/namespaces`;
        const response = await registryRequest<INamespaces>(this, 'GET', url);
        return response.body.namespaces;
    }

    private async getOrganizations(): Promise<string[]> {
        const url: string = `v2/user/orgs`;
        const response = await registryRequest<IOrganizations>(this, 'GET', url);
        return response.body.results?.map(o => o.orgname) ?? [];
    }
}

interface IToken {
    token: string
}

interface INamespaces {
    namespaces: string[];
    next?: string;
}

interface IOrganizations {
    results: [
        {
            orgname: string
        }
    ],
    next?: string;
}
