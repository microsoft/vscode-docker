/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestPromiseOptions } from 'request-promise-native';
import { localize } from '../../../localize';
import { nonNullProp } from '../../../utils/nonNull';
import { registryRequest } from '../../../utils/registryRequestUtils';
import { RemoteTagTreeItem } from '../RemoteTagTreeItem';

export class DockerV2TagTreeItem extends RemoteTagTreeItem {
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
            throw new Error(localize('vscode-docker.tree.registries.v2.dockerContentDigestString', 'docker-content-digest should be a string not an array.'));
        }
        return digest;
    }

    public async deleteTreeItemImpl(): Promise<void> {
        const digest = await this.getDigest();
        const url = `v2/${this.parent.repoName}/manifests/${digest}`;
        await registryRequest(this.parent, 'DELETE', url);
    }
}
