/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { PAGE_SIZE } from "../../../constants";
import { registryRequest } from "../../../utils/registryRequestUtils";
import { RemoteRepositoryTreeItemBase } from "../RemoteRepositoryTreeItemBase";
import { RemoteTagTreeItem } from "../RemoteTagTreeItem";
import { DockerHubNamespaceTreeItem } from "./DockerHubNamespaceTreeItem";

export class DockerHubRepositoryTreeItem extends RemoteRepositoryTreeItemBase {
    public parent: DockerHubNamespaceTreeItem;

    private _nextLink: string | undefined;

    public constructor(parent: DockerHubNamespaceTreeItem, name: string) {
        super(parent, name);
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const url = this._nextLink || `v2/repositories/${this.parent.namespace}/${this.repoName}/tags?page_size=${PAGE_SIZE}`;
        const response = await registryRequest<ITags>(this, 'GET', url);
        this._nextLink = response.body.next;
        return await this.createTreeItemsWithErrorHandling(
            response.body.results,
            'invalidTag',
            async t => new RemoteTagTreeItem(this, t.name, t.last_updated),
            t => t.name
        );
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this._nextLink;
    }
}

interface ITags {
    next?: string;
    results: ITag[];
}

interface ITag {
    name: string;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    last_updated: string;
}
