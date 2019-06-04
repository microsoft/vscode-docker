/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestPromiseOptions } from "request-promise-native";
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { PAGE_SIZE } from "../constants";
import { getNextLinkFromHeaders, registryRequest } from "../utils/registryRequestUtils";
import { treeUtils } from "../utils/treeUtils";
import { RegistryTreeItemBase } from "./RegistryTreeItemBase";
import { TagTreeItemBase } from "./TagTreeItemBase";

export abstract class RepositoryTreeItemBase extends AzExtParentTreeItem {
    public static contextValueSuffix: string = 'Repository';
    public static allContextRegExp: RegExp = /Repository$/;
    public childTypeLabel: string = 'tag';
    public parent: RegistryTreeItemBase;
    public repoName: string;
    protected _nextLink: string | undefined;

    public constructor(parent: RegistryTreeItemBase, repoName: string) {
        super(parent);
        this.repoName = repoName;
    }

    public get label(): string {
        return this.repoName;
    }

    public get iconPath(): treeUtils.IThemedIconPath {
        return treeUtils.getThemedIconPath('repository');
    }

    public get baseUrl(): string {
        return this.parent.baseUrl;
    }

    public abstract addAuth(options: RequestPromiseOptions): Promise<void>;
    public abstract createTagTreeItem(tag: string, time: string): TagTreeItemBase;

    public async loadMoreChildrenImpl(clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        let tags = await this.getTags();
        return await this.createTreeItemsWithErrorHandling(
            tags,
            'invalidTag',
            async t => {
                const time = t.time || await this.getTagTime(t.name);
                return this.createTagTreeItem(t.name, time);
            },
            t => t.name
        );
    }

    protected async getTags(): Promise<{ name: string, time?: string }[]> {
        let url = this._nextLink || `v2/${this.repoName}/tags/list?n=${PAGE_SIZE}`;
        let response = await registryRequest<ITags>(this, 'GET', url);
        this._nextLink = getNextLinkFromHeaders(response);
        return response.body.tags.map(t => { return { name: t }; });
    }

    protected async getTagTime(tag: string): Promise<string> {
        const manifestUrl: string = `v2/${this.repoName}/manifests/${tag}`;
        let manifestResponse = await registryRequest<IManifest>(this, 'GET', manifestUrl);
        let history = <IManifestHistoryV1Compatibility>JSON.parse(manifestResponse.body.history[0].v1Compatibility);
        return history.created;
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this._nextLink;
    }

    public compareChildrenImpl(ti1: AzExtTreeItem, ti2: AzExtTreeItem): number {
        if (ti1 instanceof TagTreeItemBase && ti2 instanceof TagTreeItemBase) {
            return ti2.time.valueOf() - ti1.time.valueOf();
        } else {
            return super.compareChildrenImpl(ti1, ti2);
        }
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
