/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as moment from 'moment';
import { DockerObject } from '../../docker/Common';
import { localize } from '../../localize';
import { getThemedIconPath, IconPath } from '../IconPath';
import { ITreePropertyInfo } from './ITreeSettingInfo';

export type CommonProperty = 'CreatedTime';
export type CommonGroupBy = 'None';
export type CommonSortBy = 'CreatedTime' | 'Label';

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
            return moment(new Date(item.CreatedTime)).fromNow();
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
