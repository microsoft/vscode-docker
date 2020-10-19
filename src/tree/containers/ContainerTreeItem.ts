/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { DockerContainer, DockerPort } from "../../docker/Containers";
import { ext } from "../../extensionVariables";
import { AzExtParentTreeItemIntermediate } from "../AzExtParentTreeItemIntermediate";
import { getThemedIconPath, IconPath } from '../IconPath';
import { getTreeId } from "../LocalRootTreeItemBase";
import { getContainerStateIcon } from "./ContainerProperties";
import { DockerContainerEx } from './ContainersTreeItem';
import { FilesTreeItem } from "./files/FilesTreeItem";

export class ContainerTreeItem extends AzExtParentTreeItemIntermediate {
    public static allContextRegExp: RegExp = /Container$/;
    public static runningContainerRegExp: RegExp = /^runningContainer$/i;
    private readonly _item: DockerContainerEx;
    private children: AzExtTreeItem[] | undefined;

    public constructor(parent: AzExtParentTreeItem, itemInfo: DockerContainerEx) {
        super(parent);
        this._item = itemInfo;
    }

    public get id(): string {
        return getTreeId(this._item);
    }

    public get createdTime(): number {
        return this._item.CreatedTime;
    }

    public get containerId(): string {
        return this._item.Id;
    }

    public get containerName(): string {
        return this._item.Name;
    }

    public get fullTag(): string {
        return this._item.Image;
    }

    public get labels(): { [key: string]: string } {
        return this._item.Labels;
    }

    public get label(): string {
        return ext.containersRoot.getTreeItemLabel(this._item);
    }

    public get description(): string | undefined {
        return ext.containersRoot.getTreeItemDescription(this._item);
    }

    public get contextValue(): string {
        return this._item.State + 'Container';
    }

    public get ports(): DockerPort[] {
        return this._item.Ports;
    }

    public get containerItem(): DockerContainer {
        return this._item;
    }

    /**
     * @deprecated This is only kept for backwards compatability with the "Remote Containers" extension
     * They add a context menu item "Attach Visual Studio Code" to our container nodes that relies on containerDesc
     * https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers
     */
    public get containerDesc(): { Id: string } {
        return {
            Id: this._item.Id,
        };
    }

    public get iconPath(): IconPath {
        if (this._item.Status.includes('(unhealthy)')) {
            return getThemedIconPath('statusWarning');
        } else {
            return getContainerStateIcon(this._item.State);
        }
    }

    public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
        return ext.dockerClient.removeContainer(context, this.containerId);
    }

    public hasMoreChildrenImpl(): boolean {
        return this._item.showFiles && !!this.children;
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this.children = undefined;
        }

        if (this._item.showFiles) {
            this.children = [ new FilesTreeItem(this, vscode.workspace.fs, this.containerId) ];
        }

        return this.children;
    }
}
