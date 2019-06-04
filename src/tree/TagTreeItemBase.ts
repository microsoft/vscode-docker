/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as moment from 'moment';
import { RequestPromiseOptions } from 'request-promise-native';
import { AzExtTreeItem } from "vscode-azureextensionui";
import { nonNullProp } from '../utils/nonNull';
import { registryRequest } from '../utils/registryRequestUtils';
import { treeUtils } from "../utils/treeUtils";
import { RepositoryTreeItemBase } from './RepositoryTreeItemBase';

export abstract class TagTreeItemBase extends AzExtTreeItem {
    public static contextValueSuffix: string = 'Tag';
    public static allContextRegExp: RegExp = /Tag$/;
    public parent: RepositoryTreeItemBase;
    public tag: string;
    public time: Date;

    public constructor(parent: RepositoryTreeItemBase, tag: string, time: string) {
        super(parent);
        this.tag = tag;
        this.time = new Date(time);
    }

    public get label(): string {
        return this.tag;
    }

    public get fullTag(): string {
        return this.parent.repoName + ':' + this.tag;
    }

    public get description(): string {
        return moment(this.time).fromNow();
    }

    public get iconPath(): treeUtils.IThemedIconPath {
        return treeUtils.getThemedIconPath('tag');
    }

    public async getDigest(): Promise<string> {
        const digestOptions: RequestPromiseOptions = {
            headers: {
                // According to https://docs.docker.com/registry/spec/api/
                // When deleting a manifest from a registry version 2.3 or later, the following header must be used when HEAD or GET-ing the manifest to obtain the correct digest to delete
                accept: 'application/vnd.docker.distribution.manifest.v2+json'
            }
        }

        const url = `v2/${this.parent.repoName}/manifests/${this.tag}`;
        const response = await registryRequest(this.parent, 'GET', url, digestOptions);
        const digest = nonNullProp(response.headers, 'docker-content-digest');
        if (digest instanceof Array) {
            throw new Error('docker-content-digest should be a string not an array.');
        }
        return digest;
    }

    public async deleteTreeItemImpl(): Promise<void> {
        const digest = await this.getDigest();
        const url = `v2/${this.parent.repoName}/manifests/${digest}`;
        await registryRequest(this.parent, 'DELETE', url);
    }
}
