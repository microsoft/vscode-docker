/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getThemedIconPath, IconPath } from "../IconPath";
import { CommonGroupBy, commonProperties, CommonProperty, CommonSortBy, getCommonGroupIcon, getCommonPropertyValue, groupByNoneProperty, ITreeArraySettingInfo, ITreePropertyInfo, ITreeSettingInfo, sortByProperties } from "../settings/commonTreeSettings";
import { LocalVolumeInfo } from "./LocalVolumeInfo";

export type VolumeProperty = CommonProperty | 'VolumeName';
export const volumesTreePrefix = 'volumes';
export const volumeProperties: ITreePropertyInfo<VolumeProperty>[] = [
    ...commonProperties,
    { property: 'VolumeName', exampleValue: 'my-vol' },
];

export const VolumeLabel: ITreeSettingInfo<VolumeProperty> = {
    treePrefix: volumesTreePrefix,
    setting: 'label',
    properties: volumeProperties,
    defaultProperty: 'VolumeName',
    description: 'The primary property to display for a volume.'
}

export const VolumeDescription: ITreeArraySettingInfo<VolumeProperty> = {
    treePrefix: volumesTreePrefix,
    setting: 'description',
    properties: volumeProperties,
    defaultProperty: ['CreatedTime'],
    description: 'Any secondary properties to display for a volume.'
}

export const VolumesSortBy: ITreeSettingInfo<CommonSortBy> = {
    treePrefix: volumesTreePrefix,
    setting: 'sortBy',
    properties: sortByProperties,
    defaultProperty: 'CreatedTime',
    description: 'The property used for sorting volumes.'
}

export const VolumesGroupBy: ITreeSettingInfo<VolumeProperty | CommonGroupBy> = {
    treePrefix: volumesTreePrefix,
    setting: 'groupBy',
    properties: [...volumeProperties, groupByNoneProperty],
    defaultProperty: 'None',
    description: 'The property used for grouping volumes.'
}

export function getVolumeGroupIcon(property: VolumeProperty | CommonGroupBy): IconPath {
    let icon: string;
    switch (property) {
        case 'VolumeName':
            icon = 'volume';
            break;
        default:
            return getCommonGroupIcon(property);
    }

    return getThemedIconPath(icon);
}

export function getVolumePropertyValue(item: LocalVolumeInfo, property: VolumeProperty): string {
    switch (property) {
        case 'VolumeName':
            return item.volumeName;
        default:
            return getCommonPropertyValue(item, property);
    }
}
