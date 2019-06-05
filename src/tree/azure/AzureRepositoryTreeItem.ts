/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestPromiseOptions } from "request-promise-native";
import { acquireAcrAccessToken } from "../../utils/azureUtils";
import { registryRequest } from "../../utils/registryRequestUtils";
import { RegistryType } from "../RegistryType";
import { RemoteRepositoryTreeItemBase } from "../RemoteRepositoryTreeItemBase";
import { AzureRegistryTreeItem } from "./AzureRegistryTreeItem";
import { AzureTagTreeItem } from "./AzureTagTreeItem";

export class AzureRepositoryTreeItem extends RemoteRepositoryTreeItemBase {
    public static contextValue: string = RegistryType.azure + RemoteRepositoryTreeItemBase.contextValueSuffix;
    public contextValue: string = AzureRepositoryTreeItem.contextValue;
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

    public createTagTreeItem(tag: string, time: string): AzureTagTreeItem {
        return new AzureTagTreeItem(this, tag, time);
    }

    public async deleteTreeItemImpl(): Promise<void> {
        await registryRequest(this, 'DELETE', `v2/_acr/${this.repoName}/repository`);
    }
}
