/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { workspace } from "vscode";
import { configPrefix } from "../../constants";
import { trimWithElipsis } from "../../utils/trimWithElipsis";
import { getThemedIconPath, IconPath } from "../IconPath";
import { CommonGroupBy, commonProperties, CommonProperty, getCommonGroupIcon, getCommonPropertyValue } from '../settings/CommonProperties';
import { ITreePropertyInfo } from '../settings/ITreeSettingInfo';
import { ILocalImageInfo } from "./LocalImageInfo";

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
];

export function getImageGroupIcon(property: ImageProperty | CommonGroupBy): IconPath {
    let icon: string;
    switch (property) {
        case 'Registry':
            icon = 'registry';
            break;
        case 'Repository':
        case 'RepositoryName':
            icon = 'repository';
            break;
        case 'FullTag':
        case 'ImageId':
        case 'RepositoryNameAndTag':
            icon = 'applicationGroup';
            break;
        case 'Tag':
            icon = 'tag';
            break;
        default:
            return getCommonGroupIcon(property);
    }

    return getThemedIconPath(icon);
}

export function getImagePropertyValue(item: ILocalImageInfo, property: ImageProperty): string {
    const parsedFullTag = parseFullTag(item.fullTag);
    let registry: string | undefined;
    switch (property) {
        case 'FullTag':
            if (parsedFullTag.registry) {
                return item.fullTag.replace(parsedFullTag.registry, truncateRegistry(parsedFullTag.registry));
            } else {
                return item.fullTag;
            }
        case 'ImageId':
            return item.imageId.replace('sha256:', '').slice(0, 12);
        case 'Registry':
            registry = parsedFullTag.registry;
            if (!registry) {
                registry = 'docker.io' + '/' + (parsedFullTag.namespace || 'library');
            }
            return truncateRegistry(registry);
        case 'Repository':
            registry = parsedFullTag.registry || parsedFullTag.namespace;
            if (registry) {
                return truncateRegistry(registry) + '/' + parsedFullTag.repositoryName;
            } else {
                return parsedFullTag.repositoryName;
            }
        case 'RepositoryName':
            return parsedFullTag.repositoryName;
        case 'RepositoryNameAndTag':
            if (parsedFullTag.tag) {
                return parsedFullTag.repositoryName + ':' + parsedFullTag.tag;
            } else {
                return parsedFullTag.repositoryName;
            }
        case 'Tag':
            return parsedFullTag.tag || 'latest';
        default:
            return getCommonPropertyValue(item, property);
    }
}

interface IParsedFullTag {
    registry?: string;
    namespace?: string;
    repositoryName: string;
    tag?: string;
}

function parseFullTag(rawTag: string): IParsedFullTag {
    let registry: string | undefined;
    let namespace: string | undefined;
    let repositoryName: string;
    let tag: string | undefined;

    // Pull out registry or namespace from the beginning
    let index = rawTag.indexOf('/');
    if (index !== -1) {
        const firstPart = rawTag.substring(0, index);
        if (firstPart === 'localhost' || /[:.]/.test(firstPart)) {
            // The hostname must contain a . dns separator or a : port separator before the first /
            // https://stackoverflow.com/questions/37861791/how-are-docker-image-names-parsed
            registry = firstPart;
        } else {
            // otherwise it's a part of docker.io and the first part is a namespace
            namespace = firstPart;
        }

        rawTag = rawTag.substring(index + 1);
    }

    // Pull out tag from the end
    index = rawTag.lastIndexOf(':');
    if (index !== -1) {
        tag = rawTag.substring(index + 1);
        rawTag = rawTag.substring(0, index);
    }

    // Whatever's left is the repository name
    repositoryName = rawTag;

    return {
        registry,
        repositoryName,
        namespace,
        tag
    };
}

function truncateRegistry(registry: string): string {
    let config = workspace.getConfiguration(configPrefix);
    let truncateLongRegistryPaths = config.get<boolean>('truncateLongRegistryPaths');
    if (typeof truncateLongRegistryPaths === "boolean" && truncateLongRegistryPaths) {
        let truncateMaxLength = config.get<number>('truncateMaxLength');
        if (typeof truncateMaxLength !== 'number' || truncateMaxLength < 1) {
            truncateMaxLength = 10;
        }

        return trimWithElipsis(registry, truncateMaxLength);
    }

    return registry;
}
