/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as moment from 'moment';
import { workspace, WorkspaceConfiguration } from "vscode";
import { configPrefix } from '../../constants';
import { getThemedIconPath, IconPath } from '../IconPath';
import { ILocalItem } from '../LocalRootTreeItemBase';

export type CommonTreeSetting = 'sortBy' | 'groupBy' | 'label';
export type CommonTreeArraySetting = 'description';
export type CommonProperty = 'CreatedTime';
export type CommonGroupBy = 'None';
export type CommonSortBy = 'CreatedTime' | 'Label';

export const commonProperties: ITreePropertyInfo<CommonProperty>[] = [
    { property: 'CreatedTime', exampleValue: '2 hours ago' },
];

export const groupByNoneProperty: ITreePropertyInfo<CommonGroupBy> = {
    property: 'None',
    description: 'No grouping'
};

export const sortByProperties: ITreePropertyInfo<CommonSortBy>[] = [
    { property: 'CreatedTime', description: 'Sort by newest' },
    { property: 'Label', description: 'Sort alphabetically by label' }
];

export interface ITreePropertyInfo<T extends string> {
    property: T;
    exampleValue?: string;
    description?: string;
}

interface ISettingInfoBase {
    treePrefix: string;
    description: string;
}

export interface ITreeSettingInfo<T extends string> extends ISettingInfoBase {
    setting: CommonTreeSetting;
    properties: ITreePropertyInfo<T>[];
    defaultProperty: T;
}

export interface ITreeArraySettingInfo<T extends string> extends ISettingInfoBase {
    setting: CommonTreeArraySetting;
    properties: ITreePropertyInfo<T>[];
    defaultProperty: T[];
}

export function getCommonPropertyValue(item: ILocalItem, property: CommonProperty): string | undefined {
    switch (property) {
        case 'CreatedTime':
            return moment(new Date(item.createdTime)).fromNow();
        default:
            throw new RangeError(`Unexpected property "${property}".`);
    }
}

export function getCommonGroupIcon(property: CommonProperty | CommonGroupBy): IconPath {
    let icon: string;
    switch (property) {
        case 'CreatedTime':
            icon = 'time';
            break;
        default:
            throw new RangeError(`Unexpected property "${property}".`);
    }

    return getThemedIconPath(icon);
}

export function getTreeSetting<T extends string>(settingInfo: ITreeSettingInfo<T>): T {
    const value = getTreeConfig(settingInfo).get<T>(settingInfo.setting);
    if (settingInfo.properties.find(v => v.property === value)) {
        return value;
    } else {
        return settingInfo.defaultProperty;
    }
}

export function getTreeArraySetting<T extends string>(settingInfo: ITreeArraySettingInfo<T>): T[] {
    const value = getTreeConfig(settingInfo).get<T[]>(settingInfo.setting);
    if (Array.isArray(value) && value.every(v1 => !!settingInfo.properties.find(v2 => v1 === v2.property))) {
        return value;
    } else {
        return settingInfo.defaultProperty;
    }
}

export function getTreeConfig<T extends string>(settingInfo: ITreeSettingInfo<T> | ITreeArraySettingInfo<T>): WorkspaceConfiguration {
    return workspace.getConfiguration(`${configPrefix}.${settingInfo.treePrefix}`);
}
