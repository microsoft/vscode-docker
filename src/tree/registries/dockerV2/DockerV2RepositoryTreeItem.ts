/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { PAGE_SIZE } from "../../../constants";
import { ErrorHandling, HttpErrorResponse, HttpStatusCode, IOAuthContext, RequestLike } from "../../../utils/httpRequest";
import { getNextLinkFromHeaders, registryRequest } from "../../../utils/registryRequestUtils";
import { IAuthProvider } from "../auth/IAuthProvider";
import { ICachedRegistryProvider } from "../ICachedRegistryProvider";
import { IRegistryProviderTreeItem } from "../IRegistryProviderTreeItem";
import { RemoteRepositoryTreeItemBase } from "../RemoteRepositoryTreeItemBase";
import { DockerV2RegistryTreeItemBase } from "./DockerV2RegistryTreeItemBase";
import { DockerV2TagTreeItem } from "./DockerV2TagTreeItem";

export class DockerV2RepositoryTreeItem extends RemoteRepositoryTreeItemBase implements IRegistryProviderTreeItem {
    public parent: DockerV2RegistryTreeItemBase;

    private _nextLink: string | undefined;

    public constructor(parent: DockerV2RegistryTreeItemBase, repoName: string, public readonly cachedProvider: ICachedRegistryProvider, protected readonly authHelper: IAuthProvider, protected readonly authContext?: IOAuthContext) {
        super(parent, repoName);
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const url = this._nextLink || `v2/${this.repoName}/tags/list?n=${PAGE_SIZE}`;
        const response = await registryRequest<ITags>(this, 'GET', url, undefined, ErrorHandling.ReturnErrorResponse);
        if (response.status === HttpStatusCode.NotFound) {
            // Some registries return 404 when all tags have been removed and the repository becomes effectively unavailable.
            void this.deleteTreeItem(context);
            return [];
        }
        else if (!response.ok) {
            throw new HttpErrorResponse(response);
        }

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

    public async signRequest(request: RequestLike): Promise<RequestLike> {
        if (this.authHelper) {
            const authContext: IOAuthContext | undefined = this.authContext ? { ...this.authContext, scope: `repository:${this.repoName}:${request.method === 'DELETE' ? '*' : 'pull'}` } : undefined;
            return this.authHelper.signRequest(this.cachedProvider, request, authContext);
        }

        return request;
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this._nextLink;
    }

    private async getTagTime(tag: string): Promise<string> {
        const manifestUrl: string = `v2/${this.repoName}/manifests/${tag}`;
        const manifestResponse = await registryRequest<IManifest>(this, 'GET', manifestUrl);
        const history = <IManifestHistoryV1Compatibility>JSON.parse(manifestResponse.body.history[0].v1Compatibility);
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
