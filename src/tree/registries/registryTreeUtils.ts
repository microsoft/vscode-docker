/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommonRegistry, CommonRepository, CommonTag, isDockerHubRegistry, isGitHubRegistry, isRegistry, isRepository, isTag } from "@microsoft/vscode-docker-registries";
import { l10n } from "vscode";
import { getResourceGroupFromId } from "../../utils/azureUtils";
import { AzureRegistryItem } from "./Azure/AzureRegistryDataProvider";

export function getImageNameFromRegistryTagItem(tag: CommonTag): string {
    if (!isTag(tag) || !isRepository(tag.parent)) {
        throw new Error(l10n.t('Unable to get image name'));
    }

    const repository = tag.parent as CommonRepository;
    return `${repository.label.toLowerCase()}:${tag.label.toLowerCase()}`;
}

/**
 * Get the base URL from a registry item.
 *
 * @param item - The CommonRegistry item.
 * @param includeRegistryName - Whether to include the registry name in the URL. (only applies to GitHub registries)
 * @returns The base URL as a string.
 * @throws Error if the item is not a valid type.
 */
export function getBaseUrlFromItem(item: CommonRegistry, includeGithubRegistryName: boolean = true): string {
    if (!isTag(item) && !isRepository(item) && !isRegistry(item)) {
        throw new Error(l10n.t('Unable to get base URL'));
    }

    const authority = item.baseUrl.authority;
    let path: string = '';

    // handle GitHub registries edge case
    if (includeGithubRegistryName && isGitHubRegistry(item)) {
        const parts = item.label.split('/');
        path = `/${parts[0]}`;
    }
    if (isDockerHubRegistry(item)) {
        path = `/${item.label}`;
    }

    return `${authority}${path}`;
}

/**
 * Get the full image name from a registry tag item.
 *
 * @param tag - The CommonTag item.
 * @returns The full image name as a string.
 * @throws Error if the tag is not valid or if the parent is not a registry.
 */
export function getFullImageNameFromRegistryTagItem(tag: CommonTag): string {
    if (!isTag(tag) || !isRegistry(tag.parent.parent)) {
        throw new Error(l10n.t('Unable to get full image name'));
    }

    const includeGithubRegistryName = !isGitHubRegistry(tag.parent.parent);
    const imageName = getImageNameFromRegistryTagItem(tag);
    return `${getBaseUrlFromItem(tag.parent.parent, includeGithubRegistryName)}/${imageName}`;
}

export function getFullRepositoryNameFromRepositoryItem(repository: CommonRepository): string {
    if (!isRepository(repository) || !isRegistry(repository.parent)) {
        throw new Error(l10n.t('Unable to get full repository name'));
    }

    const includeGithubRegistryName = !isGitHubRegistry(repository.parent);
    return `${getBaseUrlFromItem(repository.parent, includeGithubRegistryName)}/${repository.label.toLowerCase()}`;
}

export function getResourceGroupFromAzureRegistryItem(node: AzureRegistryItem): string {
    if (!isRegistry(node)) {
        throw new Error('Unable to get resource group');
    }

    return getResourceGroupFromId(node.id);
}
