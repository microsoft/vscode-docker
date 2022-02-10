/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureAccountTreeItemBase } from "@microsoft/vscode-azext-azureutils"; // This can't be made lazy, so users of this class must be lazy
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext, ISubscriptionContext } from "@microsoft/vscode-azext-utils";
import { Disposable } from "vscode";
import { AzureAccountExtensionListener } from "../../../utils/AzureAccountExtensionListener";
import { getAzSubTreeItem } from "../../../utils/lazyPackages";
import { ICachedRegistryProvider } from "../ICachedRegistryProvider";
import { IRegistryProviderTreeItem } from "../IRegistryProviderTreeItem";
import { getRegistryContextValue, registryProviderSuffix } from "../registryContextValues";
import type { SubscriptionTreeItem } from "./SubscriptionTreeItem";

export class AzureAccountTreeItem extends AzureAccountTreeItemBase implements IRegistryProviderTreeItem {
    public constructor(parent: AzExtParentTreeItem, public readonly cachedProvider: ICachedRegistryProvider) {
        super(parent);
        this.contextValue = getRegistryContextValue(this, registryProviderSuffix);
    }

    public async createSubscriptionTreeItem(subContext: ISubscriptionContext): Promise<SubscriptionTreeItem> {
        const azSubTreeItem = await getAzSubTreeItem();
        return new azSubTreeItem.SubscriptionTreeItem(this, subContext, this.cachedProvider);
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        const treeItems: AzExtTreeItem[] = await super.loadMoreChildrenImpl(clearCache, context);
        if (treeItems.length === 1 && treeItems[0].commandId === 'extension.open') {
            const extensionInstallEventDisposable: Disposable = AzureAccountExtensionListener.onExtensionInstalled(() => {
                extensionInstallEventDisposable.dispose();

                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                this.refresh(context);
            });
        }

        return treeItems;
    }
}
