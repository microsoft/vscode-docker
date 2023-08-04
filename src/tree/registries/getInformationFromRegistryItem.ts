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

// export async function getImageDigestFromRegistryItem(node: UnifiedRegistryItem<CommonTag>): Promise<string> {
//     if (!isTag(node.wrappedItem) || !isRepository(node.parent.wrappedItem)) {
//         throw new Error('Unable to get image name');
//     }
//     const digestOptions = {
//         headers: {
//             // According to https://docs.docker.com/registry/spec/api/
//             // When deleting a manifest from a registry version 2.3 or later, the following header must be used when HEAD or GET-ing the manifest to obtain the correct digest to delete
//             accept: 'application/vnd.docker.distribution.manifest.v2+json'
//         }
//     };
//     const url = `v2/${(node.parent.wrappedItem as CommonRepository).label}/manifests/${node.wrappedItem.label}`;
//     const response = await httpRequest<{ results: [{ name: string; }] }>(requestUrl.toString(), {
//         method: 'GET',
//         headers: {
//             Authorization: `Bearer ${(await this.authenticationProvider.getSession([], {})).accessToken}`,
//         }
//     });
//     const response = await htt;
//     const digest = response.headers.get('docker-content-digest') as string;
//     return digest;
// }
