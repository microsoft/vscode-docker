/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { DockerVolume } from "../../docker/Volumes";
import { ext } from "../../extensionVariables";
import { getThemedIconPath, IconPath } from "../IconPath";
import { getTreeId } from "../LocalRootTreeItemBase";

export class VolumeTreeItem extends AzExtTreeItem {
    public static contextValue: string = 'volume';
    public contextValue: string = VolumeTreeItem.contextValue;
    private readonly _item: DockerVolume;

    public constructor(parent: AzExtParentTreeItem, itemInfo: DockerVolume) {
        super(parent);
        this._item = itemInfo;
    }

    public get id(): string {
        return getTreeId(this._item);
    }

    public get createdTime(): number {
        return this._item.CreatedTime;
    }

    public get volumeName(): string {
        return this._item.Name;
    }

    public get label(): string {
        return ext.volumesRoot.getTreeItemLabel(this._item);
    }

    public get description(): string | undefined {
        return ext.volumesRoot.getTreeItemDescription(this._item);
    }

    public get iconPath(): IconPath {
        return getThemedIconPath('volume');
    }

    public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
        return ext.dockerClient.removeVolume(context, this._item.Id);
    }
}
