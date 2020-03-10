/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestPromiseOptions } from "request-promise-native";
import { AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { PAGE_SIZE } from "../../../constants";
import { getNextLinkFromHeaders, registryRequest } from "../../../utils/registryRequestUtils";
import { ICachedRegistryProvider } from "../ICachedRegistryProvider";
import { RemoteRepositoryTreeItemBase } from "../RemoteRepositoryTreeItemBase";
import { DockerV2RegistryTreeItemBase } from "./DockerV2RegistryTreeItemBase";
import { DockerV2TagTreeItem } from "./DockerV2TagTreeItem";
import { addAccessToken, OAuthContext } from "./oAuthUtils";

export class DockerV2RepositoryTreeItem extends RemoteRepositoryTreeItemBase {
    public parent: DockerV2RegistryTreeItemBase;

    private _nextLink: string | undefined;

    public constructor(parent: DockerV2RegistryTreeItemBase, repoName: string, private readonly cachedProvider?: ICachedRegistryProvider, private readonly _oAuthContext?: OAuthContext) {
        super(parent, repoName);
    }

    public async loadMoreChildrenImpl(clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        let url = this._nextLink || `v2/${this.repoName}/tags/list?n=${PAGE_SIZE}`;
        let response = await registryRequest<ITags>(this, 'GET', url);
        this._nextLink = getNextLinkFromHeaders(response);
        return await this.createTreeItemsWithErrorHandling(
            response.body.tags,
            'invalidTag',
            async t => {
                const time = await this.getTagTime(t);
                return new DockerV2TagTreeItem(this, t, time);
            },
            t => t
        );
    }

    public async addAuth(options: RequestPromiseOptions): Promise<void> {
        if (this._oAuthContext) {
            await addAccessToken(this.cachedProvider, { ...this._oAuthContext, scope: `repository:${this.repoName}:${options.method === 'DELETE' ? '*' : 'pull'}` }, options);
        } else if (this.parent.addAuth) {
            await this.parent.addAuth(options);
        }
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this._nextLink;
    }

    private async getTagTime(tag: string): Promise<string> {
        const manifestUrl: string = `v2/${this.repoName}/manifests/${tag}`;
        let manifestResponse = await registryRequest<IManifest>(this, 'GET', manifestUrl);
        let history = <IManifestHistoryV1Compatibility>JSON.parse(manifestResponse.body.history[0].v1Compatibility);
        return history.created;
    }
}

interface ITags {
    tags: string[];
}

interface IManifestHistory {
    v1Compatibility: string; // stringified ManifestHistoryV1Compatibility
}

interface IManifestHistoryV1Compatibility {
    created: string;
}

interface IManifest {
    history: IManifestHistory[];
}
