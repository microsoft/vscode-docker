/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommonRegistryItem, CommonRepository, CommonTag, isRegistry, isRepository, isTag } from "@microsoft/vscode-docker-registries";
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

export function getBaseUrlFromItem(item: CommonRegistryItem): string {
    if (!isTag(item) && !isRepository(item) && !isRegistry(item)) {
        throw new Error(l10n.t('Unable to get base URL'));
    }
    const authority = item.baseUrl.authority;
    const path = item.baseUrl.path === '/' ? '' : item.baseUrl.path;

    return `${authority}${path}`;
}

export function getFullImageNameFromRegistryTagItem(tag: CommonTag): string {
    if (!isTag(tag) || !isRegistry(tag.parent.parent)) {
        throw new Error(l10n.t('Unable to get full image name'));
    }
    const imageName = getImageNameFromRegistryTagItem(tag);
    return `${getBaseUrlFromItem(tag)}/${imageName}`;
}

export function getFullRepositoryNameFromRepositoryItem(repository: CommonRepository): string {
    if (!isRepository(repository) || !isRegistry(repository.parent)) {
        throw new Error(l10n.t('Unable to get full repository name'));
    }

    return `${getBaseUrlFromItem(repository)}/${repository.label.toLowerCase()}`;
}

export function getResourceGroupFromAzureRegistryItem(node: AzureRegistryItem): string {
    if (!isRegistry(node)) {
        throw new Error('Unable to get resource group');
    }

    return getResourceGroupFromId(node.id);
}
