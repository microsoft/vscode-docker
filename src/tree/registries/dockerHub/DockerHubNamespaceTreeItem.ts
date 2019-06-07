/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestPromiseOptions } from "request-promise-native";
import { dockerHubUrl, PAGE_SIZE } from "../../../constants";
import { registryRequest } from "../../../utils/registryRequestUtils";
import { RegistryTreeItemBase } from "../RegistryTreeItemBase";
import { RegistryType } from "../RegistryType";
import { DockerHubAccountTreeItem } from "./DockerHubAccountTreeItem";
import { DockerHubRepositoryTreeItem } from "./DockerHubRepositoryTreeItem";

export class DockerHubNamespaceTreeItem extends RegistryTreeItemBase {
    public static contextValue: string = RegistryType.dockerHub + RegistryTreeItemBase.contextValueSuffix;
    public contextValue: string = DockerHubNamespaceTreeItem.contextValue;
    public parent: DockerHubAccountTreeItem;
    public baseUrl: string = dockerHubUrl;
    public namespace: string;

    public constructor(parent: DockerHubAccountTreeItem, namespace: string) {
        super(parent);
        this.namespace = namespace;
    }

    public get label(): string {
        return this.namespace;
    }

    public async getRepositories(): Promise<string[]> {
        let relativeUrl = this._nextLink || `v2/repositories/${this.namespace}?page_size=${PAGE_SIZE}`;
        let response = await registryRequest<IRepositories>(this, 'GET', relativeUrl);
        this._nextLink = response.body.next;
        return response.body.results.map(v => v.name);
    }

    public createRepositoryTreeItem(name: string): DockerHubRepositoryTreeItem {
        return new DockerHubRepositoryTreeItem(this, name);
    }

    public async addAuth(options: RequestPromiseOptions): Promise<void> {
        await this.parent.addAuth(options);
    }
}

interface IRepositories {
    results: IRepository[];
    next?: string;
}

interface IRepository {
    name: string;
}
