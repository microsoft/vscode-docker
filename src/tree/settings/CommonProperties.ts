/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dayjs from 'dayjs';
import * as relativeTime from 'dayjs/plugin/relativeTime';
import { ThemeIcon } from 'vscode';
import { localize } from '../../localize';
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
    description: localize('vscode-docker.tree.settings.none', 'No grouping')
};

export const sortByProperties: ITreePropertyInfo<CommonSortBy>[] = [
    { property: 'CreatedTime', description: localize('vscode-docker.tree.settings.createdTime', 'Sort by newest') },
    { property: 'Label', description: localize('vscode-docker.tree.settings.label', 'Sort alphabetically by label') }
];

export function getCommonPropertyValue(item: { createdAt?: Date, size?: number }, property: CommonProperty): string {
    switch (property) {
        case 'CreatedTime':
            return !!(item?.createdAt) ? dayjs(item.createdAt).fromNow() : '';
        case 'Size':
            return Number.isInteger(item?.size) ? `${Math.round(item.size / (1024 * 1024))} MB` : '';
        default:
            throw new RangeError(localize('vscode-docker.tree.settings.unexpected1', 'Unexpected property "{0}".', property));
    }
}

export function getCommonGroupIcon(property: CommonProperty | CommonGroupBy): ThemeIcon {
    let icon: string;
    switch (property) {
        case 'CreatedTime':
            icon = 'watch';
            break;
        default:
            throw new RangeError(localize('vscode-docker.tree.settings.unexpected2', 'Unexpected property "{0}".', property));
    }

    return new ThemeIcon(icon);
}
