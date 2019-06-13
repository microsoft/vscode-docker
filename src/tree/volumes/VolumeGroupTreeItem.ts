/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IconPath } from "../IconPath";
import { LocalGroupTreeItemBase } from "../LocalGroupTreeItemBase";
import { getTreeSetting } from "../settings/commonTreeSettings";
import { LocalVolumeInfo } from "./LocalVolumeInfo";
import { getVolumeGroupIcon, VolumesGroupBy } from "./volumeTreeSettings";

export class VolumeGroupTreeItem extends LocalGroupTreeItemBase<LocalVolumeInfo> {
    public static readonly contextValue: string = 'volumeGroup';
    public readonly contextValue: string = VolumeGroupTreeItem.contextValue;
    public childTypeLabel: string = 'volume';

    public get iconPath(): IconPath {
        let groupBy = getTreeSetting(VolumesGroupBy);
        return getVolumeGroupIcon(groupBy);
    }
}
