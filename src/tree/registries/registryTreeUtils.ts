/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommonRegistry, CommonRepository, CommonTag, isDockerHubRegistry, isGitHubRegistry, isRegistry, isRepository, isTag } from "@microsoft/vscode-docker-registries";
import { l10n } from "vscode";
import { getResourceGroupFromId } from "../../utils/azureUtils";
import { AzureRegistryItem } from "./Azure/AzureRegistryDataProvider";

/**
 * Returns the image name from a registry tag item
 * ex: hello-world:latest
 */
export function getImageNameFromRegistryTagItem(tag: CommonTag): string {
    if (!isTag(tag) || !isRepository(tag.parent)) {
        throw new Error(l10n.t('Unable to get image name'));
    }

    const repository = tag.parent as CommonRepository;
    return `${repository.label.toLowerCase()}:${tag.label.toLowerCase()}`;
}

/**
 * Returns the base image path from a registry
 * ex: docker.io/library     (Docker Hub)
 *     myregistry.azurecr.io (Azure)
 *     ghcr.io/library       (GitHub)
 *     localhost:5000        (Local)
 */
export function getBaseImagePathFromRegistry(registry: CommonRegistry): string {
    if (!isRegistry(registry)) {
        throw new Error(l10n.t('Unable to get base image path'));
    }

    const baseUrl = registry.baseUrl.authority;

    if (isDockerHubRegistry(registry) || isGitHubRegistry(registry)) {
        return `${baseUrl}/${registry.label}`;
    }

    return baseUrl;
}

/**
 * Returns the full image name from a registry tag item
 *
 * ex: docker.io/library/hello-world:latest     (Docker Hub)
 *     myregistry.azurecr.io/hello-world:latest (Azure)
 *     ghcr.io/myregistry/hello-world:latest    (GitHub)
 *     localhost:5000/hello-world:latest        (Local)
 */
export function getFullImageNameFromRegistryTagItem(tag: CommonTag): string {
    if (!isTag(tag) || !isRegistry(tag.parent.parent)) {
        throw new Error(l10n.t('Unable to get full image name'));
    }

    const baseImageName = getBaseImagePathFromRegistry(tag.parent.parent);
    let imageName = getImageNameFromRegistryTagItem(tag);

    // For GitHub, the image name is prefixed with the registry name so we
    // need to remove it since it is already in the base image name
    if (isGitHubRegistry(tag.parent.parent)) {
        const regex = /\/(.*)$/; // Match "/" followed by anything until the end
        const match = imageName.match(regex);
        if (match) {
            imageName = match[1];
        }
    }

    return `${baseImageName}/${imageName}`;
}

/**
 * Returns the full repository name from a registry repository item
 * ex: docker.io/library/hello-world      (Docker Hub)
 *     myregistry.azurecr.io/hello-world  (Azure)
 *     ghcr.io/myregistry/hello-world     (GitHub)
 *     localhost:5000/hello-world         (Local)
 */
export function getFullRepositoryNameFromRepositoryItem(repository: CommonRepository): string {
    if (!isRepository(repository) || !isRegistry(repository.parent)) {
        throw new Error(l10n.t('Unable to get full repository name'));
    }

    let imageName = repository.label.toLowerCase();
    const baseImageName = getBaseImagePathFromRegistry(repository.parent);
    // For GitHub, the image name is prefixed with the registry name so we
    // need to remove it since it is already in the base image name
    if (isGitHubRegistry(repository.parent)) {
        const regex = /\/(.*)$/; // Match "/" followed by anything until the end
        const match = imageName.match(regex);
        if (match) {
            imageName = match[1];
        }
    }
    return `${baseImageName}/${imageName}`;
}

/**
 * Returns the resource group from an Azure registry item
 */
export function getResourceGroupFromAzureRegistryItem(node: AzureRegistryItem): string {
    if (!isRegistry(node)) {
        throw new Error('Unable to get resource group');
    }

    return getResourceGroupFromId(node.id);
}
