/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerInfo } from "dockerode";
import { ILocalImageInfo } from "../images/LocalImageInfo";

/**
 * Wrapper class for Dockerode item, which has inconsistent names/types
 */
export class LocalContainerInfo implements ILocalImageInfo {
    public data: ContainerInfo;
    public constructor(data: ContainerInfo) {
        this.data = data;
    }

    public get createdTime(): number {
        return this.data.Created * 1000;
    }

    public get containerId(): string {
        return this.data.Id;
    }

    public get containerName(): string {
        return this.data.Names[0].substr(1); // Remove start '/'
    }

    public get fullTag(): string {
        return this.data.Image;
    }

    public get imageId(): string {
        return this.data.ImageID;
    }

    public get ports(): number[] {
        return this.data.Ports.map(p => p.PublicPort);
    }

    public get state(): string {
        return this.data.State;
    }

    public get status(): string {
        return this.data.Status;
    }

    public get treeId(): string {
        return this.containerId;
    }
}
