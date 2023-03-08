/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dayjs from 'dayjs';
import * as relativeTime from 'dayjs/plugin/relativeTime';
import { l10n, ThemeIcon } from 'vscode';
import { convertToMB } from '../../utils/convertToMB';
import { ITreePropertyInfo } from './ITreeSettingInfo';

dayjs.extend(relativeTime);

export type CommonProperty = 'CreatedTime' | 'Size';
export type CommonGroupBy = 'None';
export type CommonSortBy = 'CreatedTime' | 'Label' | 'Size';

export const commonProperties: ITreePropertyInfo<Exclude<CommonProperty, 'Size'>>[] = [
    { property: 'CreatedTime', exampleValue: '2 hours ago' },
];

export const groupByNoneProperty: ITreePropertyInfo<CommonGroupBy> = {
    property: 'None',
    description: l10n.t('No grouping')
};

export const sortByProperties: ITreePropertyInfo<CommonSortBy>[] = [
    { property: 'CreatedTime', description: l10n.t('Sort by newest') },
    { property: 'Label', description: l10n.t('Sort alphabetically by label') }
];

export function getCommonPropertyValue(item: { createdAt?: Date, size?: number }, property: CommonProperty): string {
    switch (property) {
        case 'CreatedTime':
            return !!(item?.createdAt) ? dayjs(item.createdAt).fromNow() : '';
        case 'Size':
            return Number.isInteger(item?.size) ? `${convertToMB(item.size)} MB` : '';
        default:
            throw new RangeError(l10n.t('Unexpected property "{0}".', property));
    }
}

export function getCommonGroupIcon(property: CommonProperty | CommonGroupBy): ThemeIcon {
    let icon: string;
    switch (property) {
        case 'CreatedTime':
            icon = 'watch';
            break;
        default:
            throw new RangeError(l10n.t('Unexpected property "{0}".', property));
    }

    return new ThemeIcon(icon);
}
