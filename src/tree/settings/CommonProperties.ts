/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dayjs from 'dayjs';
import * as relativeTime from 'dayjs/plugin/relativeTime';
import { DockerObject } from '../../docker/Common';
import { localize } from '../../localize';
import { getThemedIconPath, IconPath } from '../IconPath';
import { ITreePropertyInfo } from './ITreeSettingInfo';

dayjs.extend(relativeTime);

export type CommonProperty = 'CreatedTime' | 'Size';
export type CommonGroupBy = 'None';
export type CommonSortBy = 'CreatedTime' | 'Label' | 'Size';

export const commonProperties: ITreePropertyInfo<CommonProperty>[] = [
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

export function getCommonPropertyValue(item: DockerObject, property: CommonProperty): string {
    switch (property) {
        case 'CreatedTime':
            return dayjs(item.CreatedTime).fromNow();
        case 'Size':
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/tslint/config
            const size: number = (item as any).Size ?? 0;
            return `${Math.round(size / (1024 * 1024))} MB`;
        default:
            throw new RangeError(localize('vscode-docker.tree.settings.unexpected1', 'Unexpected property "{0}".', property));
    }
}

export function getCommonGroupIcon(property: CommonProperty | CommonGroupBy): IconPath {
    let icon: string;
    switch (property) {
        case 'CreatedTime':
            icon = 'time';
            break;
        default:
            throw new RangeError(localize('vscode-docker.tree.settings.unexpected2', 'Unexpected property "{0}".', property));
    }

    return getThemedIconPath(icon);
}
