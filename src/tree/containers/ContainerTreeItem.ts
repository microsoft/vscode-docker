/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Container } from "dockerode";
import { AzExtParentTreeItem, AzExtTreeItem } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { getThemedIconPath, IconPath } from '../IconPath';
import { getContainerStateIcon } from "./ContainerProperties";
import { LocalContainerInfo } from "./LocalContainerInfo";

export class ContainerTreeItem extends AzExtTreeItem {
    public static allContextRegExp: RegExp = /Container$/;
    public static runningContainerRegExp: RegExp = /^runningContainer$/i;
    private readonly _item: LocalContainerInfo;

    public constructor(parent: AzExtParentTreeItem, itemInfo: LocalContainerInfo) {
        super(parent);
        this._item = itemInfo;
    }

    public get id(): string {
        return this._item.treeId;
    }

    public get createdTime(): number {
        return this._item.createdTime;
    }

    public get containerId(): string {
        return this._item.containerId;
    }

    public get containerName(): string {
        return this._item.containerName;
    }

    public get fullTag(): string {
        return this._item.fullTag;
    }

    public get label(): string {
        return ext.containersRoot.getTreeItemLabel(this._item);
    }

    public get description(): string | undefined {
        return ext.containersRoot.getTreeItemDescription(this._item);
    }

    public get contextValue(): string {
        return this._item.state + 'Container';
    }

    /**
     * @deprecated This is only kept for backwards compatability with the "Remote Containers" extension
     * They add a context menu item "Attach Visual Studio Code" to our container nodes that relies on containerDesc
     * https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers
     */
    public get containerDesc(): {} {
        return this._item.data;
    }

    public get iconPath(): IconPath {
        if (this._item.status.includes('(unhealthy)')) {
            return getThemedIconPath('statusWarning');
        } else {
            return getContainerStateIcon(this._item.state);
        }
    }

    public getContainer(): Container {
        return ext.dockerode.getContainer(this.containerId);
    }

    public async deleteTreeItemImpl(): Promise<void> {
        await this.getContainer().remove({ force: true });
    }
}
