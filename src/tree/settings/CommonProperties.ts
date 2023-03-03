/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dayjs from 'dayjs';
import * as relativeTime from 'dayjs/plugin/relativeTime';
import { l10n, ThemeIcon, workspace } from 'vscode';
import { Labels } from '../../runtimes/docker/contracts/ContainerClient';
import { convertToMB } from '../../utils/convertToMB';
import { ITreePropertyInfo } from './ITreeSettingInfo';


dayjs.extend(relativeTime);

export type CommonProperty = 'CreatedTime' | 'Size' | 'Label';
export type CommonGroupBy = 'None';
export type CommonSortBy = 'CreatedTime' | 'Label' | 'Size';

export const commonProperties: ITreePropertyInfo<Exclude<CommonProperty, 'Size'>>[] = [
    { property: 'CreatedTime', exampleValue: '2 hours ago' },
    { property: 'Label', exampleValue: 'It\'s just a test mane' },
];

export const groupByNoneProperty: ITreePropertyInfo<CommonGroupBy> = {
    property: 'None',
    description: l10n.t('No grouping')
};

export const sortByProperties: ITreePropertyInfo<CommonSortBy>[] = [
    { property: 'CreatedTime', description: l10n.t('Sort by newest') },
    { property: 'Label', description: l10n.t('Sort alphabetically by label') }
];

export function getCommonPropertyValue(item: { createdAt?: Date, size?: number, labels?: Labels }, property: CommonProperty, itemType: 'containers' | 'images' | 'networks' | 'volumes'): string {
    switch (property) {
        case 'CreatedTime':
            return !!(item?.createdAt) ? dayjs(item.createdAt).fromNow() : '';
        case 'Size':
            return Number.isInteger(item?.size) ? `${convertToMB(item.size)} MB` : '';
        case 'Label':
            return getLabel(item?.labels);
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
        case 'Label':
            icon = 'symbol-class';
            break;
        default:
            throw new RangeError(l10n.t('Unexpected property "{0}".', property));
    }

    return new ThemeIcon(icon);
}

export const NonLabelGroupName = l10n.t('others');

export function getLabel(containerLabels: Labels): string {
    if (!containerLabels) {
        return NonLabelGroupName;
    }

    const labelName = workspace.getConfiguration('docker')?.get<string | undefined>('containers.groupByLabel', undefined);
    if (!labelName) {
        return NonLabelGroupName;
    }

    const labels = Object.keys(containerLabels).map(label => ({ label: label, value: containerLabels[label] }));

    const composeProject = labels.find(l => l.label === labelName);
    if (composeProject) {
        return composeProject.value;
    } else {
        return NonLabelGroupName;
    }
}



