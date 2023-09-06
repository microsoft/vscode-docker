/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommonRegistry, CommonRepository, CommonTag, isDockerHubRegistry, isGenericV2Registry, isGitHubRegistry, isRegistry, isRepository, isTag } from "@microsoft/vscode-docker-registries";
import { l10n } from "vscode";
import { getResourceGroupFromId } from "../../utils/azureUtils";
import { AzureRegistryItem as AzureRegistry, isAzureRegistry } from "./Azure/AzureRegistryDataProvider";

export function getImageNameFromTag(tag: CommonTag): string {
    if (!isTag(tag) || !isRepository(tag.parent)) {
        throw new Error(l10n.t('Unable to get image name'));
    }

    const repository = tag.parent as CommonRepository;
    return `${repository.label.toLowerCase()}:${tag.label.toLowerCase()}`;
}

export function getBaseImagePathFromRegistry(registry: CommonRegistry): string {
    if (!isRegistry(registry)) {
        throw new Error(l10n.t('Unable to get base image path'));
    } else if (isAzureRegistry(registry) || isGenericV2Registry(registry) || isGitHubRegistry(registry)) {
        return registry.baseUrl.authority.toLowerCase();
    } else if (isDockerHubRegistry(registry)) {
        registry = registry as CommonRegistry;
        return registry.label.toLowerCase();
    } else {
        registry = registry as CommonRegistry;
        return registry.baseUrl.authority.toLowerCase();
    }
}

export function getFullImageNameFromTag(tag: CommonTag): string {
    const baseImagePath = getBaseImagePathFromRegistry(tag.parent.parent);
    const imageName = getImageNameFromTag(tag);
    return `${baseImagePath}/${imageName}`;
}

export function getFullRepositoryNameFromRepositoryItem(repository: CommonRepository): string {
    if (!isRepository(repository)) {
        throw new Error(l10n.t('Unable to get full repository name'));
    }

    const baseImagePath = getBaseImagePathFromRegistry(repository.parent);
    return `${baseImagePath}/${repository.label.toLowerCase()}`;
}

export function getResourceGroupFromAzureRegistryItem(node: AzureRegistry): string {
    if (!isRegistry(node)) {
        throw new Error('Unable to get resource group');
    }

    return getResourceGroupFromId(node.id);
}
