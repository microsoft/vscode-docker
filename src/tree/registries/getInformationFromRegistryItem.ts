/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommonRegistry, CommonRepository, CommonTag, isRegistry, isRepository, isTag } from "@microsoft/vscode-docker-registries";
import { Uri } from "vscode";
import { UnifiedRegistryItem } from "./UnifiedRegistryTreeDataProvider";

export function getImageNameFromRegistryItem(node: UnifiedRegistryItem<CommonTag>): string {
    if (!isTag(node.wrappedItem) || !isRepository(node.parent.wrappedItem)) {
        throw new Error('Unable to get image name');
    }

    return `${(node.parent.wrappedItem as CommonRepository).label}:${node.wrappedItem.label}`;
}

export function getFullImageNameFromRegistryItem(node: UnifiedRegistryItem<CommonTag>): string {
    const imageName = getImageNameFromRegistryItem(node);
    if (!isRegistry(node.parent.parent?.wrappedItem)) {
        throw new Error('Unable to get full image name');
    }

    const registryLabel = (node.parent.parent.wrappedItem as CommonRegistry).label;
    switch (node.wrappedItem.additionalContextValues?.[0] ?? '') {
        case 'registryV2Tag': {
            const authority = Uri.parse(registryLabel).authority; // this should parse since we have validation logic
            return `${authority.toLowerCase()}/${imageName}`;
        }
        case 'dockerHubTag':
        default:
            return `${registryLabel}/${imageName}`;
    }
}