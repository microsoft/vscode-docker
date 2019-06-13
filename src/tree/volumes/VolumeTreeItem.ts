/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Volume } from "dockerode";
import { AzExtParentTreeItem, AzExtTreeItem } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { getThemedIconPath, IconPath } from "../IconPath";
import { getTreeArraySetting, getTreeSetting } from "../settings/commonTreeSettings";
import { LocalVolumeInfo } from "./LocalVolumeInfo";
import { getVolumePropertyValue, VolumeDescription, VolumeLabel } from "./volumeTreeSettings";

export class VolumeTreeItem extends AzExtTreeItem {
    public static contextValue: string = 'volume';
    public contextValue: string = VolumeTreeItem.contextValue;
    private readonly _item: LocalVolumeInfo;

    public constructor(parent: AzExtParentTreeItem, itemInfo: LocalVolumeInfo) {
        super(parent);
        this._item = itemInfo;
    }

    public get id(): string {
        return this._item.treeId;
    }

    public get createdTime(): number {
        return this._item.createdTime;
    }

    public get volumeName(): string {
        return this._item.volumeName;
    }

    public get label(): string {
        const prop = getTreeSetting(VolumeLabel);
        return getVolumePropertyValue(this._item, prop);
    }

    public get description(): string | undefined {
        const props = getTreeArraySetting(VolumeDescription);
        const values: string[] = props.map(prop => getVolumePropertyValue(this._item, prop));
        return values.join(' - ');
    }

    public get iconPath(): IconPath {
        return getThemedIconPath('volume');
    }

    public getVolume(): Volume {
        return ext.dockerode.getVolume(this.volumeName);
    }

    public async deleteTreeItemImpl(): Promise<void> {
        await this.getVolume().remove({ force: true });
    }
}
