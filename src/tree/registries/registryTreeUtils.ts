/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommonRegistry, CommonRepository, CommonTag, isRegistry, isRepository, isTag } from "@microsoft/vscode-docker-registries";
import { l10n } from "vscode";
import { getResourceGroupFromId } from "../../utils/azureUtils";
import { AzureRegistryItem } from "./Azure/AzureRegistryDataProvider";

export function getImageNameFromRegistryTagItem(tag: CommonTag): string {
    if (!isTag(tag) || !isRepository(tag.parent)) {
        throw new Error(l10n.t('Unable to get image name'));
    }

    const repository = tag.parent as CommonRepository;

    return `${repository.label}:${tag.label}`;
}

export function getBaseImagePathFromRegistryItem(registry: CommonRegistry): string {
    if (!isRegistry(registry)) {
        throw new Error(l10n.t('Unable to get base image path'));
    }

    switch (registry.additionalContextValues?.[0] ?? '') {
        case 'azureContainerRegistry':
        case 'genericRegistryV2': {
            return registry.baseUrl.authority.toLowerCase();
        }
        case 'dockerHubRegistry':
        default:
            return `${registry.label}`;
    }
}

export function getFullImageNameFromRegistryTagItem(tag: CommonTag): string {
    const imageName = getImageNameFromRegistryTagItem(tag);
    const baseImagePath = getBaseImagePathFromRegistryItem(tag.parent.parent);
    return `${baseImagePath}/${imageName}`;
}

export function getResourceGroupFromAzureRegistryItem(node: AzureRegistryItem): string {
    if (!isRegistry(node)) {
        throw new Error('Unable to get resource group');
    }

    return getResourceGroupFromId(node.wrappedItem.id);
}
