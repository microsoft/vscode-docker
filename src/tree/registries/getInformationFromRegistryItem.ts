/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommonRegistry, CommonRepository, CommonTag, isRegistry, isRepository, isTag } from "@microsoft/vscode-docker-registries";
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

    return `${(node.parent.parent.wrappedItem as CommonRegistry).label}/${imageName}`;
}
