/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestPromiseOptions } from "request-promise-native";
import { acquireAcrAccessToken } from "../../../utils/azureUtils";
import { registryRequest } from "../../../utils/registryRequestUtils";
import { DockerV2RepositoryTreeItem } from "../dockerV2/DockerV2RepositoryTreeItem";
import { AzureRegistryTreeItem } from "./AzureRegistryTreeItem";

export class AzureRepositoryTreeItem extends DockerV2RepositoryTreeItem {
    public parent: AzureRegistryTreeItem;

    public constructor(parent: AzureRegistryTreeItem, name: string) {
        super(parent, name);
    }

    public async addAuth(options: RequestPromiseOptions): Promise<void> {
        const azureAuthScope: string = `repository:${this.repoName}:${options.method === 'DELETE' ? '*' : 'pull'}`;
        options.auth = {
            bearer: await acquireAcrAccessToken(this.parent.host, this.parent.parent.root, azureAuthScope)
        };
    }

    public async deleteTreeItemImpl(): Promise<void> {
        await registryRequest(this, 'DELETE', `v2/_acr/${this.repoName}/repository`);
    }
}
