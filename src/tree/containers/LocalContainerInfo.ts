/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerInfo } from "dockerode";
import { localize } from "../../localize";
import { ILocalItem } from "../LocalRootTreeItemBase";

/**
 * Interface implemented by `LocalContainerInfo`
 */
export interface ILocalContainerInfo extends ILocalItem {
    fullTag: string;
    imageId: string;
    containerId: string;
    containerName: string;
    networks: string[];
    ports: number[];
    state: string;
    status: string;
    composeProjectName: string;
}

export const NonComposeGroupName = localize('vscode-docker.tree.containers.otherContainers', 'Other Containers');
/**
 * Wrapper class for Dockerode item, which has inconsistent names/types
 */
export class LocalContainerInfo implements ILocalContainerInfo {
    private _containerName: string;
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
        if (!this._containerName) {
            const names = this.data.Names.map(name => name.substr(1)); // Remove start '/'

            // Linked containers may have names containing '/'; their one "canonical" names will not.
            const canonicalName = names.find(name => name.indexOf('/') === -1);

            this._containerName = canonicalName ?? names[0];
        }

        return this._containerName;
    }

    public get fullTag(): string {
        return this.data.Image;
    }

    public get imageId(): string {
        return this.data.ImageID;
    }

    public get networks(): string[] {
        return Object.keys(this.data.NetworkSettings.Networks);
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

    public get composeProjectName(): string {
        const labels = Object.keys(this.data.Labels)
            .map(label => ({ label: label, value: this.data.Labels[label] }));

        const composeProject = labels.find(l => l.label === 'com.docker.compose.project');
        if (composeProject) {
            return composeProject.value;
        } else {
            return NonComposeGroupName;
        }
    }

    public get treeId(): string {
        // include state in treeId so that auto-refresh will detect and show a new icon when state changes
        return this.containerId + this.state;
    }
}
