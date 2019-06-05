/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RegistryType } from "../RegistryType";
import { RemoteTagTreeItemBase } from "../RemoteTagTreeItemBase";
import { DockerHubRepositoryTreeItem } from "./DockerHubRepositoryTreeItem";

export class DockerHubTagTreeItem extends RemoteTagTreeItemBase {
    public static contextValue: string = RegistryType.dockerHub + RemoteTagTreeItemBase.contextValueSuffix;
    public contextValue: string = DockerHubTagTreeItem.contextValue;
    public parent: DockerHubRepositoryTreeItem;

    public constructor(parent: DockerHubRepositoryTreeItem, tag: string, time: string) {
        super(parent, tag, time);
    }

    public async getDigest(): Promise<string> {
        // Theoretically this error should never happen because "Copy Image Digest" and "Delete Image" are not display for Docker Hub
        throw new Error('Getting digest is not yet supported for Docker Hub.');
    }
}
