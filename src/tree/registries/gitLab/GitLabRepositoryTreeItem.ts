/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { PAGE_SIZE } from "../../../constants";
import { getNextLinkFromHeaders, registryRequest } from "../../../utils/registryRequestUtils";
import { RemoteRepositoryTreeItemBase } from "../RemoteRepositoryTreeItemBase";
import { RemoteTagTreeItem } from "../RemoteTagTreeItem";
import { GitLabProjectTreeItem } from "./GitLabProjectTreeItem";

export class GitLabRepositoryTreeItem extends RemoteRepositoryTreeItemBase {
    public parent: GitLabProjectTreeItem;
    public readonly repoId: string;

    private _nextLink?: string;

    public constructor(parent: GitLabProjectTreeItem, id: string, name: string) {
        // GitLab returns an empty repository name,
        // if the project's namespace is the same as the repository
        super(parent, name || parent.label);
        this.repoId = id;
        this.id = this.repoId;
    }

    public async loadMoreChildrenImpl(clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        let url = this._nextLink || `api/v4/projects/${this.parent.projectId}/registry/repositories/${this.repoId}/tags?per_page=${PAGE_SIZE}`;
        let response = await registryRequest<ITag[]>(this, 'GET', url);
        this._nextLink = getNextLinkFromHeaders(response);
        return await this.createTreeItemsWithErrorHandling(
            response.body,
            'invalidTag',
            async t => {
                const details = await this.getTagDetails(t.name);
                return new RemoteTagTreeItem(this, t.name, details.created_at);
            },
            t => t.name
        );
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this._nextLink;
    }

    private async getTagDetails(tag: string): Promise<ITagDetails> {
        const url = `api/v4/projects/${this.parent.projectId}/registry/repositories/${this.repoId}/tags/${tag}`;
        const response = await registryRequest<ITagDetails>(this, 'GET', url);
        return response.body;
    }
}

interface ITag {
    name: string;
}

interface ITagDetails {
    /* eslint-disable-next-line camelcase */
    created_at: string;
}
