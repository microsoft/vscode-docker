/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ThemeIcon, workspace } from "vscode";
import { configPrefix } from "../../constants";
import { DockerImage } from "../../docker/Images";
import { trimWithElipsis } from "../../utils/trimWithElipsis";
import { CommonGroupBy, CommonProperty, commonProperties, getCommonGroupIcon, getCommonPropertyValue } from '../settings/CommonProperties';
import { ITreePropertyInfo } from '../settings/ITreeSettingInfo';

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

export function getImagePropertyValue(item: DockerImage, property: ImageProperty): string {
    const parsedFullTag = parseFullTag(item.Name);
    let registry: string | undefined;
    switch (property) {
        case 'FullTag':
            if (parsedFullTag.registry) {
                return item.Name.replace(parsedFullTag.registry, truncateRegistry(parsedFullTag.registry));
            } else {
                return item.Name;
            }
        case 'ImageId':
            return item.Id.replace('sha256:', '').slice(0, 12);
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

    return {
        registry,
        repositoryName: rawTag,
        namespace,
        tag
    };
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
