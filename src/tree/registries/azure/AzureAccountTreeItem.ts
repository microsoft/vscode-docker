/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzureAccountTreeItemBase, ISubscriptionContext } from "vscode-azureextensionui";
import { getIconPath, IconPath } from "../../IconPath";
import { ICachedRegistryProvider, IRegistryProviderTreeItem } from "../IRegistryProvider";
import { getRegistryContextValue, registryProviderSuffix } from "../registryContextValues";
import { SubscriptionTreeItem } from "./SubscriptionTreeItem";

export class AzureAccountTreeItem extends AzureAccountTreeItemBase implements IRegistryProviderTreeItem {
    public cachedProvider: ICachedRegistryProvider;

    public constructor(parent: AzExtParentTreeItem, cachedProvider: ICachedRegistryProvider) {
        super(parent);
        this.cachedProvider = cachedProvider;
    }

    public get contextValue(): string {
        return getRegistryContextValue(this, registryProviderSuffix);
    }

    public set contextValue(_value: string) {
        // ignore
    }

    public get iconPath(): IconPath {
        return getIconPath('azure');
    }

    public createSubscriptionTreeItem(subContext: ISubscriptionContext): SubscriptionTreeItem {
        return new SubscriptionTreeItem(this, subContext);
    }
}
