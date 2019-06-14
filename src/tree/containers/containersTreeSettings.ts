/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getThemedIconPath, IconPath } from "../IconPath";
import { getImageGroupIcon, getImagePropertyValue, imageProperties, ImageProperty } from "../images/imagesTreeSettings";
import { CommonGroupBy, CommonSortBy, groupByNoneProperty, ITreeArraySettingInfo, ITreePropertyInfo, ITreeSettingInfo, sortByProperties } from "../settings/commonTreeSettings";
import { LocalContainerInfo } from "./LocalContainerInfo";

export const containersTreePrefix = 'containers';
export type ContainerProperty = ImageProperty | 'ContainerId' | 'ContainerName' | 'Ports' | 'State' | 'Status';
export const containerProperties: ITreePropertyInfo<ContainerProperty>[] = [
    ...imageProperties,
    { property: 'ContainerId', exampleValue: 'fdeab20e859d' },
    { property: 'ContainerName', exampleValue: 'amazing_hoover' },
    { property: 'Ports', exampleValue: '8080' },
    { property: 'State', exampleValue: 'exited' },
    { property: 'Status', exampleValue: 'Exited (0) 2 hours ago' }
];

export const ContainerLabel: ITreeSettingInfo<ContainerProperty> = {
    treePrefix: containersTreePrefix,
    setting: 'label',
    properties: containerProperties,
    defaultProperty: 'FullTag',
    description: 'The primary property to display for a container.'
}

export const ContainerDescription: ITreeArraySettingInfo<ContainerProperty> = {
    treePrefix: containersTreePrefix,
    setting: 'description',
    properties: containerProperties,
    defaultProperty: ['ContainerName', 'Status'],
    description: 'Any secondary properties to display for a container.'
}

export const ContainersGroupBy: ITreeSettingInfo<ContainerProperty | CommonGroupBy> = {
    treePrefix: containersTreePrefix,
    setting: 'groupBy',
    properties: [...containerProperties, groupByNoneProperty],
    defaultProperty: 'None',
    description: 'The property used for grouping containers.'
}

export const ContainersSortBy: ITreeSettingInfo<CommonSortBy> = {
    treePrefix: containersTreePrefix,
    setting: 'sortBy',
    properties: sortByProperties,
    defaultProperty: 'CreatedTime',
    description: 'The property used for sorting containers.'
}

export function getContainerPropertyValue(item: LocalContainerInfo, property: ContainerProperty): string {
    switch (property) {
        case 'ContainerId':
            return item.containerId.slice(0, 12);
        case 'ContainerName':
            return item.containerName;
        case 'Ports':
            return item.ports.length > 0 ? item.ports.join(',') : '<none>';
        case 'State':
            return item.state;
        case 'Status':
            return item.status;
        default:
            return getImagePropertyValue(item, property);
    }
}

export function getContainerGroupIcon(property: ContainerProperty | CommonGroupBy, group: string): IconPath {
    let icon: string;
    switch (property) {
        case 'ContainerId':
        case 'ContainerName':
        case 'Ports':
        case 'Status':
            icon = 'applicationGroup';
            break;
        case 'State':
            return getStateIcon(group);
        default:
            return getImageGroupIcon(property);
    }

    return getThemedIconPath(icon);
}

export function getStateIcon(state: string): IconPath {
    let icon: string;
    switch (state) {
        case 'created':
        case 'dead':
        case 'exited':
        case 'removing':
            icon = 'statusStop';
            break;
        case 'paused':
            icon = 'statusPause';
            break;
        case 'restarting':
            icon = 'restart';
            break;
        case 'running':
        default:
            icon = 'statusRun';
    }
    return getThemedIconPath(icon);
}
