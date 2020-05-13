/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { dockerContextManager } from "../../utils/dockerContextManager";
import { getThemedIconPath, IconPath } from '../IconPath';
import { LocalContextInfo } from "./LocalContextInfo";

export class ContextTreeItem extends AzExtTreeItem {
    public static contextValue: string = 'context';
    public contextValue: string = ContextTreeItem.contextValue;
    private readonly _item: LocalContextInfo;

    public constructor(parent: AzExtParentTreeItem, item: LocalContextInfo) {
        super(parent);
        this._item = item;
    }

    public get createdTime(): number {
        return this._item.createdTime;
    }

    public get id(): string {
        return this._item.treeId;
    }

    public get label(): string {
        return ext.contextsRoot.getTreeItemLabel(this._item);
    }

    // this is the description shown in tree item which can include one or more properites combined.
    // This is not the description of the context.
    public get description(): string | undefined {
        return ext.contextsRoot.getTreeItemDescription(this._item);
    }

    public get name(): string {
        return this._item.data.Name;
    }

    public get current(): boolean {
        return this._item.data.Current;
    }

    public get iconPath(): IconPath {
        if (this._item.data.Current) {
            return getThemedIconPath('connect');
        }
    }

    public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
        return dockerContextManager.remove(this.name);
    }

    public async inspect(context: IActionContext): Promise<string> {
        return dockerContextManager.inspect(this.name)
    }

    public async use(context: IActionContext): Promise<void> {
        return dockerContextManager.use(this.name);
    }
}
