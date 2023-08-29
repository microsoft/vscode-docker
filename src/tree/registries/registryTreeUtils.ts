/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommonRegistry, CommonRepository, CommonTag, isGenericV2Registry, isGitHubRegistry, isRegistry, isRepository, isTag } from "@microsoft/vscode-docker-registries";
import { l10n } from "vscode";
import { getResourceGroupFromId } from "../../utils/azureUtils";
import { AzureRegistryItem, isAzureRegistryItem } from "./Azure/AzureRegistryDataProvider";

export function getImageNameFromRegistryTagItem(tag: CommonTag): string {
    if (!isTag(tag) || !isRepository(tag.parent)) {
        throw new Error(l10n.t('Unable to get image name'));
    }

    const repository = tag.parent as CommonRepository;
    return `${repository.label.toLowerCase()}:${tag.label.toLowerCase()}`;
}

export function getBaseImagePathFromRegistryItem(registry: CommonRegistry): string {
    if (!isRegistry(registry)) {
        throw new Error(l10n.t('Unable to get base image path'));
    } else if (isAzureRegistryItem(registry) || isGenericV2Registry(registry) || isGitHubRegistry(registry)) {
        return registry.baseUrl.authority.toLowerCase();
    } else {
        return registry.label.toLowerCase();
    }
}

export function getFullImageNameFromRegistryTagItem(tag: CommonTag): string {
    const imageName = getImageNameFromRegistryTagItem(tag);
    const baseImagePath = getBaseImagePathFromRegistryItem(tag.parent.parent);
    return `${baseImagePath}/${imageName}`;
}

export function getFullRepositoryNameFromRepositoryItem(repository: CommonRepository): string {
    if (!isRepository(repository)) {
        throw new Error(l10n.t('Unable to get full repository name'));
    }

    const baseImagePath = getBaseImagePathFromRegistryItem(repository.parent);
    return `${baseImagePath}/${repository.label.toLowerCase()}`;
}

export function getResourceGroupFromAzureRegistryItem(node: AzureRegistryItem): string {
    if (!isRegistry(node)) {
        throw new Error('Unable to get resource group');
    }

    return getResourceGroupFromId(node.id);
}
