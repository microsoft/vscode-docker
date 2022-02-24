/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { PAGE_SIZE, dockerHubUrl } from "../../../constants";
import { RequestLike } from "../../../utils/httpRequest";
import { registryRequest } from "../../../utils/registryRequestUtils";
import { IDockerCliCredentials, RegistryTreeItemBase } from "../RegistryTreeItemBase";
import { DockerHubAccountTreeItem } from "./DockerHubAccountTreeItem";
import { DockerHubRepositoryTreeItem } from "./DockerHubRepositoryTreeItem";

export class DockerHubNamespaceTreeItem extends RegistryTreeItemBase {
    public parent: DockerHubAccountTreeItem;
    public baseUrl: string = dockerHubUrl;
    public namespace: string;

    private _nextLink: string | undefined;

    public constructor(parent: DockerHubAccountTreeItem, namespace: string) {
        super(parent);
        this.namespace = namespace;
    }

    public get label(): string {
        return this.namespace;
    }

    public get baseImagePath(): string {
        return this.namespace;
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const url = this._nextLink || `v2/repositories/${this.namespace}?page_size=${PAGE_SIZE}`;
        const response = await registryRequest<IRepositories>(this, 'GET', url);
        this._nextLink = response.body.next;
        return await this.createTreeItemsWithErrorHandling(
            response.body.results,
            'invalidRepository',
            r => new DockerHubRepositoryTreeItem(this, r.name),
            r => r.name
        );
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this._nextLink;
    }

    public async signRequest(request: RequestLike): Promise<RequestLike> {
        return this.parent.signRequest(request);
    }

    public async getDockerCliCredentials(): Promise<IDockerCliCredentials> {
        return {
            registryPath: '',
            auth: {
                username: this.parent.username,
                password: await this.parent.getPassword()
            }
        };
    }
}

interface IRepositories {
    results: IRepository[];
    next?: string;
}

interface IRepository {
    name: string;
}
