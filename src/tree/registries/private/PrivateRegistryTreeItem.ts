/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AuthOptions } from "request";
import { RequestPromiseOptions } from "request-promise-native";
import { AzExtTreeItem, IActionContext, parseError } from "vscode-azureextensionui";
import { registryRequest } from "../../../utils/registryRequestUtils";
import { RegistryTreeItemBase } from "../RegistryTreeItemBase";
import { RegistryType } from "../RegistryType";
import { PrivateRegistriesTreeItem, PrivateRegistryNonsensitive } from "./PrivateRegistriesTreeItem";
import { PrivateRepositoryTreeItem } from "./PrivateRepositoryTreeItem";

export class PrivateRegistryTreeItem extends RegistryTreeItemBase {
    public static contextValue: string = RegistryType.private + RegistryTreeItemBase.contextValueSuffix;
    public contextValue: string = PrivateRegistryTreeItem.contextValue;
    public parent: PrivateRegistriesTreeItem;

    private _reg: PrivateRegistryNonsensitive;

    public constructor(parent: PrivateRegistriesTreeItem, reg: PrivateRegistryNonsensitive) {
        super(parent);
        this._reg = reg;
    }

    public get label(): string {
        return this.host;
    }

    public get id(): string {
        return this.baseUrl;
    }

    public get baseUrl(): string {
        return this._reg.url;
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            try {
                // If the call succeeds, it's a V2 registry (https://docs.docker.com/registry/spec/api/#api-version-check)
                await registryRequest(this, 'GET', 'v2');
            } catch (error) {
                if (parseError(error).errorType === "401") {
                    const message = 'OAuth support has not yet been implemented in this preview feature. This registry does not appear to support basic authentication.';
                    throw new Error(message);
                } else {
                    throw error;
                }
            }
        }

        return super.loadMoreChildrenImpl(clearCache, context);
    }

    public createRepositoryTreeItem(name: string): PrivateRepositoryTreeItem {
        return new PrivateRepositoryTreeItem(this, name);
    }

    public async getAuth(): Promise<AuthOptions> {
        return await this.parent.getAuth(this._reg);
    }

    public async addAuth(options: RequestPromiseOptions): Promise<void> {
        options.auth = await this.getAuth();
    }

    public async deleteTreeItemImpl(_context: IActionContext): Promise<void> {
        await this.parent.disconnectRegistry(this._reg);
    }
}
