/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as moment from 'moment';
import { getThemedIconPath, IconPath } from '../IconPath';
import { ILocalItem } from '../LocalRootTreeItemBase';
import { ITreePropertyInfo } from './ITreeSettingInfo';

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

export function getCommonPropertyValue(item: ILocalItem, property: CommonProperty): string {
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
