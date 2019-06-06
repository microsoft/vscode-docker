/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerRegistryManagementClient, ContainerRegistryManagementModels as AcrModels } from "azure-arm-containerregistry";
import { RequestPromiseOptions } from "request-promise-native";
import { AzExtTreeItem, createAzureClient, IActionContext } from "vscode-azureextensionui";
import { acquireAcrAccessToken, getResourceGroupFromId } from "../../../utils/azureUtils";
import { nonNullProp } from "../../../utils/nonNull";
import { getIconPath, IconPath } from "../../IconPath";
import { RegistryTreeItemBase } from "../RegistryTreeItemBase";
import { RegistryType } from "../RegistryType";
import { AzureRepositoryTreeItem } from "./AzureRepositoryTreeItem";
import { AzureTasksTreeItem } from "./AzureTasksTreeItem";
import { SubscriptionTreeItem } from "./SubscriptionTreeItem";

export class AzureRegistryTreeItem extends RegistryTreeItemBase {
    public static contextValue: string = RegistryType.azure + RegistryTreeItemBase.contextValueSuffix;
    public contextValue: string = AzureRegistryTreeItem.contextValue;
    public parent: SubscriptionTreeItem;

    private _tasksTreeItem: AzureTasksTreeItem;
    private _registry: AcrModels.Registry;

    public constructor(parent: SubscriptionTreeItem, registry: AcrModels.Registry) {
        super(parent);
        this._registry = registry;
        this._tasksTreeItem = new AzureTasksTreeItem(this);
    }

    public get registryName(): string {
        return nonNullProp(this._registry, 'name');
    }

    public get registryId(): string {
        return nonNullProp(this._registry, 'id');
    }

    public get resourceGroup(): string {
        return getResourceGroupFromId(this.registryId);
    }

    public get client(): ContainerRegistryManagementClient {
        return createAzureClient(this.parent.root, ContainerRegistryManagementClient);
    }

    public get label(): string {
        return this.registryName;
    }

    public get id(): string {
        return this.registryId;
    }

    public get properties(): {} {
        return this._registry;
    }

    public get iconPath(): IconPath {
        return getIconPath('azureRegistry');
    }

    public get baseUrl(): string {
        return `https://${nonNullProp(this._registry, 'loginServer')}`;
    }

    public createRepositoryTreeItem(name: string): AzureRepositoryTreeItem {
        return new AzureRepositoryTreeItem(this, name);
    }

    public async addAuth(options: RequestPromiseOptions): Promise<void> {
        options.auth = {
            bearer: await acquireAcrAccessToken(this.host, this.parent.root, 'registry:catalog:*')
        };
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        const children: AzExtTreeItem[] = await super.loadMoreChildrenImpl(clearCache, context);
        if (clearCache) {
            children.push(this._tasksTreeItem);
        }
        return children;
    }

    public compareChildrenImpl(ti1: AzExtTreeItem, ti2: AzExtTreeItem): number {
        if (ti1 instanceof AzureTasksTreeItem) {
            return -1;
        } else if (ti2 instanceof AzureTasksTreeItem) {
            return 1;
        } else {
            return super.compareChildrenImpl(ti1, ti2);
        }
    }

    public async pickTreeItemImpl(expectedContextValues: (string | RegExp)[]): Promise<AzExtTreeItem | undefined> {
        if (expectedContextValues.some(v => this._tasksTreeItem.isAncestorOfImpl(v))) {
            return this._tasksTreeItem;
        } else {
            return undefined;
        }
    }

    public async deleteTreeItemImpl(): Promise<void> {
        await this.client.registries.deleteMethod(this.resourceGroup, this.registryName);
    }

    public async tryGetAdminCredentials(): Promise<AcrModels.RegistryListCredentialsResult | undefined> {
        if (this._registry.adminUserEnabled) {
            return await this.client.registries.listCredentials(this.resourceGroup, this.registryName);
        } else {
            return undefined;
        }
    }
}
