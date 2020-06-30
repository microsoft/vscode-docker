/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DockerVolume } from "../../docker/Volumes";
import { getThemedIconPath, IconPath } from "../IconPath";
import { LocalGroupTreeItemBase } from "../LocalGroupTreeItemBase";
import { getCommonGroupIcon } from "../settings/CommonProperties";
import { VolumeProperty } from "./VolumeProperties";

export class VolumeGroupTreeItem extends LocalGroupTreeItemBase<DockerVolume, VolumeProperty> {
    public static readonly contextValue: string = 'volumeGroup';
    public readonly contextValue: string = VolumeGroupTreeItem.contextValue;
    public childTypeLabel: string = 'volume';

    public get iconPath(): IconPath {
        let icon: string;
        switch (this.parent.groupBySetting) {
            case 'VolumeName':
                icon = 'volume';
                break;
            default:
                return getCommonGroupIcon(this.parent.groupBySetting);
        }

        return getThemedIconPath(icon);
    }
}
