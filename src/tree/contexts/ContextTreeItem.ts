/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { dockerContextManager } from "../../utils/dockerContextManager";
import { getThemedIconPath, IconPath } from '../IconPath';
import { LocalGroupTreeItemBase } from "../LocalGroupTreeItemBase";
import { ContextProperty } from "./ContextProperties";
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
        return this._item.data.Name;
    }

    public get label(): string {
        return this._item.data.Name;
    }

    public get description(): string | undefined {
        return this._item.data.Description;
    }

    public get name(): string {
        return this._item.data.Name;
    }

    public get dockerEndpoint(): string {
        return this._item.data.DockerEndpoint;
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
        await dockerContextManager.remove(this.name);
    }

    public async inspect(context: IActionContext): Promise<string> {
        return await dockerContextManager.inspect(this.name)
    }

    public async use(context: IActionContext): Promise<void> {
        return await dockerContextManager.use(this.name);
    }
}

export class ContextGroupTreeItem extends LocalGroupTreeItemBase<LocalContextInfo, ContextProperty> {
    public static readonly contextValue: string = 'contextGroup';
    public readonly contextValue: string = ContextGroupTreeItem.contextValue;
    public childTypeLabel: string = 'context';

    public get iconPath(): IconPath {
        return getThemedIconPath('none');
    }
}
