/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { DockerContext, DockerContextInspection } from "../../docker/Contexts";
import { ext } from "../../extensionVariables";
import { getThemedIconPath, IconPath } from '../IconPath';
import { getTreeId } from "../LocalRootTreeItemBase";

export class ContextTreeItem extends AzExtTreeItem {
    public static allContextRegExp: RegExp = /Context$/;
    public static removableContextRegExp: RegExp = /^customContext$/i;

    private readonly _item: DockerContext;

    public constructor(parent: AzExtParentTreeItem, item: DockerContext) {
        super(parent);
        this._item = item;
    }

    public get contextValue(): string {
        if (this.name === 'default') {
            return 'defaultContext';
        } else if (this.current) {
            return 'currentCustomContext';
        }

        return 'customContext';
    }

    public get createdTime(): number {
        return undefined;
    }

    public get id(): string {
        return getTreeId(this._item);
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
        return this._item.Name;
    }

    public get current(): boolean {
        return this._item.Current;
    }

    public get iconPath(): IconPath {
        if (this._item.Current) {
            return getThemedIconPath('connect');
        }
    }

    public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
        return ext.dockerContextManager.remove(context, this.name);
    }

    public async inspect(context: IActionContext): Promise<DockerContextInspection> {
        return ext.dockerContextManager.inspect(context, this.name);
    }

    public async use(context: IActionContext): Promise<void> {
        return ext.dockerContextManager.use(context, this.name);
    }
}
