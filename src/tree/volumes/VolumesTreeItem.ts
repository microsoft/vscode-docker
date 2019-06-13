/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext } from "../../extensionVariables";
import { LocalChildGroupType, LocalChildType, LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { CommonGroupBy, CommonSortBy, getTreeSetting, ITreeSettingInfo } from "../settings/commonTreeSettings";
import { LocalVolumeInfo } from "./LocalVolumeInfo";
import { VolumeGroupTreeItem } from "./VolumeGroupTreeItem";
import { VolumeTreeItem } from "./VolumeTreeItem";
import { getVolumePropertyValue, VolumeProperty, VolumesGroupBy, VolumesSortBy, volumesTreePrefix } from "./volumeTreeSettings";

export class VolumesTreeItem extends LocalRootTreeItemBase<LocalVolumeInfo> {
    public treePrefix: string = volumesTreePrefix;
    public label: string = 'Volumes';
    public childTypeLabel: string = 'volume';
    public noItemsMessage: string = "Successfully connected, but no volumes found.";
    public childType: LocalChildType<LocalVolumeInfo> = VolumeTreeItem;
    public childGroupType: LocalChildGroupType<LocalVolumeInfo> = VolumeGroupTreeItem;
    public sortBySettingInfo: ITreeSettingInfo<CommonSortBy> = VolumesSortBy;
    public groupBySettingInfo: ITreeSettingInfo<VolumeProperty | CommonGroupBy> = VolumesGroupBy;

    public async getItems(): Promise<LocalVolumeInfo[]> {
        const result = await ext.dockerode.listVolumes();
        const volumes = (result && result.Volumes) || [];
        return volumes.map(v => new LocalVolumeInfo(v));
    }

    public getGroup(item: LocalVolumeInfo): string | undefined {
        let groupBy = getTreeSetting(VolumesGroupBy);
        if (groupBy === 'None') {
            return undefined;
        } else {
            return getVolumePropertyValue(item, groupBy);
        }
    }
}
