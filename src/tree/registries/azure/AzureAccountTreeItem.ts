/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from "vscode";
import { AzExtParentTreeItem, AzExtTreeItem, AzureAccountTreeItemBase, IActionContext, ISubscriptionContext } from "vscode-azureextensionui";
import { AzureAccountExtensionListener } from "../../../utils/AzureAccountExtensionListener";
import { ICachedRegistryProvider } from "../ICachedRegistryProvider";
import { IRegistryProviderTreeItem } from "../IRegistryProviderTreeItem";
import { getRegistryContextValue, registryProviderSuffix } from "../registryContextValues";
import { SubscriptionTreeItem } from "./SubscriptionTreeItem";

export class AzureAccountTreeItem extends AzureAccountTreeItemBase implements IRegistryProviderTreeItem {
    public constructor(parent: AzExtParentTreeItem, public readonly cachedProvider: ICachedRegistryProvider) {
        super(parent);
    }

    public get contextValue(): string {
        return getRegistryContextValue(this, registryProviderSuffix);
    }

    public set contextValue(_value: string) {
        // this is needed because the parent `AzureAccountTreeItemBase` has a setter, but we ignore `_value` in favor of the above getter
    }

    public createSubscriptionTreeItem(subContext: ISubscriptionContext): SubscriptionTreeItem {
        return new SubscriptionTreeItem(this, subContext, this.cachedProvider);
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        const treeItems: AzExtTreeItem[] = await super.loadMoreChildrenImpl(_clearCache, context);
        if (treeItems.length === 1 && treeItems[0].commandId === 'extension.open') {
            const extensionInstallEventDisposable: Disposable = AzureAccountExtensionListener.onExtensionInstalled(() => {
                extensionInstallEventDisposable.dispose();

                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                this.refresh();
            });
        }

        return treeItems;
    }
}
