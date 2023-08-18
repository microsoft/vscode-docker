/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommonRegistry, CommonRepository, CommonTag, isRegistry, isRepository, isTag } from "@microsoft/vscode-docker-registries";
import { getResourceGroupFromId } from "../../utils/azureUtils";
import { AzureRegistryItem } from "./Azure/AzureRegistryDataProvider";
import { UnifiedRegistryItem } from "./UnifiedRegistryTreeDataProvider";

export function getImageNameFromRegistryItem(node: UnifiedRegistryItem<CommonTag>): string {
    if (!isTag(node.wrappedItem) || !isRepository(node.parent.wrappedItem)) {
        throw new Error('Unable to get image name');
    }

    const repository = node.parent.wrappedItem as CommonRepository;

    return `${repository.label}:${node.wrappedItem.label}`;
}

export function getFullImageNameFromRegistryItem(node: UnifiedRegistryItem<CommonTag>): string {
    const imageName = getImageNameFromRegistryItem(node);
    if (!isRegistry(node.parent.parent?.wrappedItem)) {
        throw new Error('Unable to get full image name');
    }

    const registry = node.parent.parent.wrappedItem as CommonRegistry;

    switch (node.wrappedItem.additionalContextValues?.[0] ?? '') {
        case 'azureContainerTag':
        case 'registryV2Tag': {
            const authority = registry.baseUrl.authority;
            return `${authority.toLowerCase()}/${imageName}`;
        }
        case 'dockerHubTag':
        default:
            return `${registry.label}/${imageName}`;
    }
}

export function getResourceGroupFromAzureRegistryItem(node: UnifiedRegistryItem<AzureRegistryItem>): string {
    if (!isRegistry(node.wrappedItem)) {
        throw new Error('Unable to get resource group');
    }

    return getResourceGroupFromId(node.wrappedItem.id);
}
