/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, UserCancelledError, parseError } from '@microsoft/vscode-azext-utils';
import { registryRequest } from '../../../utils/registryRequestUtils';
import { RemoteTagTreeItem } from '../RemoteTagTreeItem';

export class DockerV2TagTreeItem extends RemoteTagTreeItem {
    public async getDigest(): Promise<string> {
        const digestOptions = {
            headers: {
                // According to https://docs.docker.com/registry/spec/api/
                // When deleting a manifest from a registry version 2.3 or later, the following header must be used when HEAD or GET-ing the manifest to obtain the correct digest to delete
                accept: 'application/vnd.docker.distribution.manifest.v2+json'
            }
        };

        const url = `v2/${this.parent.repoName}/manifests/${this.tag}`;
        const response = await registryRequest(this.parent, 'GET', url, digestOptions);
        const digest = response.headers.get('docker-content-digest') as string;
        return digest;
    }

    public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
        const digest = await this.getDigest();
        const url = `v2/${this.parent.repoName}/manifests/${digest}`;

        try {
            await registryRequest(this.parent, 'DELETE', url);
        } catch (error) {
            const errorType: string = parseError(error).errorType.toLowerCase();
            if (errorType === '405' || errorType === 'unsupported') {
                // Don't wait
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                context.ui.showWarningMessage('Deleting remote images is not supported on this registry. It may need to be enabled.', { learnMoreLink: 'https://aka.ms/AA7jsql' });
                throw new UserCancelledError();
            } else {
                throw error;
            }
        }
    }
}
