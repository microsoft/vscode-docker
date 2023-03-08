/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ThemeIcon, workspace } from "vscode";
import { configPrefix } from "../../constants";
import { ListImagesItem } from "../../runtimes/docker";
import { trimWithElipsis } from "../../utils/trimWithElipsis";
import { CommonGroupBy, commonProperties, CommonProperty, getCommonGroupIcon, getCommonPropertyValue } from '../settings/CommonProperties';
import { ITreePropertyInfo } from '../settings/ITreeSettingInfo';
import { NormalizedImageNameInfo } from "./NormalizedImageNameInfo";

export type ImageProperty = CommonProperty | 'FullTag' | 'ImageId' | 'Registry' | 'Repository' | 'RepositoryName' | 'RepositoryNameAndTag' | 'Tag';

export const imageProperties: ITreePropertyInfo<ImageProperty>[] = [
    ...commonProperties,
    { property: 'FullTag', exampleValue: 'example.azurecr.io/hello-world:latest' },
    { property: 'ImageId', exampleValue: 'd9d09edd6115' },
    { property: 'Registry', exampleValue: 'example.azurecr.io' },
    { property: 'Repository', exampleValue: 'example.azurecr.io/hello-world' },
    { property: 'RepositoryName', exampleValue: 'hello-world' },
    { property: 'RepositoryNameAndTag', exampleValue: 'hello-world:latest' },
    { property: 'Tag', exampleValue: 'latest' },
    { property: 'Size', exampleValue: '27 MB' },
];

export function getImageGroupIcon(property: ImageProperty | CommonGroupBy): ThemeIcon {
    switch (property) {
        case 'Registry':
            return new ThemeIcon('briefcase');
        case 'Repository':
        case 'RepositoryName':
            return new ThemeIcon('repo');
        case 'FullTag':
        case 'ImageId':
        case 'RepositoryNameAndTag':
            return new ThemeIcon('multiple-windows');
        case 'Tag':
            return new ThemeIcon('bookmark');
        default:
            return getCommonGroupIcon(property);
    }
}

export function getImagePropertyValue(item: ListImagesItem, property: ImageProperty): string {
    const normalizedImageNameInfo = new NormalizedImageNameInfo(item.image);

    let result: string;
    switch (property) {
        case 'FullTag':
            result = normalizedImageNameInfo.fullTag;
            break;
        case 'ImageId':
            result = item.id.replace('sha256:', '').slice(0, 12);
            break;
        case 'Registry':
            result = normalizedImageNameInfo.normalizedRegistry;
            break;
        case 'Repository':
            result = normalizedImageNameInfo.normalizedRegistryAndImageName;
            break;
        case 'RepositoryName':
            result = normalizedImageNameInfo.normalizedImageName;
            break;
        case 'RepositoryNameAndTag':
            result = normalizedImageNameInfo.normalizedImageNameAndTag;
            break;
        case 'Tag':
            result = normalizedImageNameInfo.normalizedTag;
            break;
        default:
            result = getCommonPropertyValue(item, property);
            break;
    }

    // Regardless of the above result, truncate the registry if it is in the string
    if (item.image.registry) {
        result = result.replace(item.image.registry, truncateRegistry(item.image.registry));
    }

    return result;
}

function truncateRegistry(registry: string): string {
    const config = workspace.getConfiguration(configPrefix);
    const truncateLongRegistryPaths = config.get<boolean>('truncateLongRegistryPaths');
    if (typeof truncateLongRegistryPaths === "boolean" && truncateLongRegistryPaths) {
        let truncateMaxLength = config.get<number>('truncateMaxLength');
        if (typeof truncateMaxLength !== 'number' || truncateMaxLength < 1) {
            truncateMaxLength = 10;
        }

        return trimWithElipsis(registry, truncateMaxLength);
    }

    return registry;
}
