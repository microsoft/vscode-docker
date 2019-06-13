/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem } from "vscode-azureextensionui";
import { ILocalItem, LocalRootTreeItemBase } from "./LocalRootTreeItemBase";

export abstract class LocalGroupTreeItemBase<T extends ILocalItem> extends AzExtParentTreeItem {
    public parent: LocalRootTreeItemBase<T>;
    public group: string;
    private _items: T[];

    public constructor(parent: LocalRootTreeItemBase<T>, group: string, items: T[]) {
        super(parent);
        this.group = group;
        this._items = items;
    }

    public get label(): string {
        return this.group;
    }

    public get id(): string {
        return this.group;
    }

    public get maxCreatedTime(): number {
        return Math.max(...this._items.map(i => i.createdTime));
    }

    public async loadMoreChildrenImpl(_clearCache: boolean): Promise<AzExtTreeItem[]> {
        return this._items.map(i => new this.parent.childType(this, i));
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public compareChildrenImpl(ti1: AzExtTreeItem, ti2: AzExtTreeItem): number {
        return this.parent.compareChildrenImpl(ti1, ti2);
    }
}
