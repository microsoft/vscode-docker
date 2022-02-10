/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem } from "@microsoft/vscode-azext-utils";
import { DockerObject } from "../docker/Common";
import { LocalRootTreeItemBase } from "./LocalRootTreeItemBase";
import { CommonProperty } from "./settings/CommonProperties";

export abstract class LocalGroupTreeItemBase<TItem extends DockerObject, TProperty extends string | CommonProperty> extends AzExtParentTreeItem {
    public readonly parent: LocalRootTreeItemBase<TItem, TProperty>;
    public readonly group: string;
    private _items: TItem[];
    private _childTreeItems: AzExtTreeItem[];

    public constructor(parent: LocalRootTreeItemBase<TItem, TProperty>, group: string, items: TItem[]) {
        super(parent);
        this.group = group;
        this.id = this.group + '|LocalGroup'; // Add suffix to ensure this id doesn't coincidentally overlap with a non-grouped item
        this._items = items;
    }

    public get label(): string {
        return this.group;
    }

    public get maxCreatedTime(): number {
        return Math.max(...this._items.map(i => i.CreatedTime));
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
        this._childTreeItems = this.getChildTreeItems();
        return this._childTreeItems;
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public compareChildrenImpl(ti1: AzExtTreeItem, ti2: AzExtTreeItem): number {
        return this.parent.compareChildrenImpl(ti1, ti2);
    }

    public get ChildTreeItems(): AzExtTreeItem[] {
        if (!this._childTreeItems) {
            this._childTreeItems = this.getChildTreeItems();
        }
        return this._childTreeItems;
    }

    private getChildTreeItems(): AzExtTreeItem[] {
        return this._items.map(i => new this.parent.childType(this, i));
    }
}
