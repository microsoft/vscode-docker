/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ImageInfo } from "dockerode";
import { ILocalItem } from "../LocalRootTreeItemBase";

/**
 * Interface implemented by `LocalImageInfo`
 */
export interface ILocalImageInfo extends ILocalItem {
    fullTag: string;
    imageId: string;
    repoDigests?: string[];
}

/**
 * Wrapper class for Dockerode item, which has inconsistent names/types
 */
export class LocalImageInfo implements ILocalImageInfo {
    public data: ImageInfo;
    public fullTag: string;
    public constructor(data: ImageInfo, fullTag: string) {
        this.data = data;
        this.fullTag = fullTag;
    }

    public get createdTime(): number {
        return this.data.Created * 1000;
    }

    public get imageId(): string {
        return this.data.Id;
    }

    public get treeId(): string {
        return this.fullTag + this.imageId;
    }

    public get repoDigests(): string[] {
        return this.data.RepoDigests;
    }
}
