/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestPromiseOptions } from "request-promise-native";
import { PAGE_SIZE } from "../../constants";
import { registryRequest } from "../../utils/registryRequestUtils";
import { RegistryType } from "../RegistryType";
import { RepositoryTreeItemBase } from "../RepositoryTreeItemBase";
import { DockerHubRegistryTreeItem } from "./DockerHubRegistryTreeItem";
import { DockerHubTagTreeItem } from "./DockerHubTagTreeItem";

export class DockerHubRepositoryTreeItem extends RepositoryTreeItemBase {
    public static contextValue: string = RegistryType.dockerHub + RepositoryTreeItemBase.contextValueSuffix;
    public contextValue: string = DockerHubRepositoryTreeItem.contextValue;
    public parent: DockerHubRegistryTreeItem;

    public constructor(parent: DockerHubRegistryTreeItem, name: string) {
        super(parent, name);
    }

    protected async getTags(): Promise<{ name: string, time?: string }[]> {
        let relativeUrl = this._nextLink || `v2/repositories/${this.parent.namespace}/${this.repoName}/tags?page_size=${PAGE_SIZE}`;
        let response = await registryRequest<ITags>(this, 'GET', relativeUrl);
        this._nextLink = response.body.next;
        return response.body.results.map(t => { return { name: t.name, time: t.last_updated }; });
    }

    public createTagTreeItem(tag: string, time: string): DockerHubTagTreeItem {
        return new DockerHubTagTreeItem(this, tag, time);
    }

    public async addAuth(options: RequestPromiseOptions): Promise<void> {
        await this.parent.addAuth(options);
    }

    protected async getTagTime(_tag: string): Promise<string> {
        // Theoretically this should never happen because time is set when getting tags above
        throw new Error('Docker Hub should already have tag time.');
    }
}

interface ITags {
    next?: string;
    results: ITag[];
}

interface ITag {
    name: string;
    last_updated: string;
}
