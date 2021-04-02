/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DockerObject } from './Common';

export type VolumeDriverType = string;

export interface DockerVolume extends DockerObject {
    readonly Driver?: VolumeDriverType;

    readonly Id: undefined; // Not defined for volumes
    readonly Description?: string;
}

export interface VolumeInspectionContainers {
    [containerId: string]: {
        readonly Name: string;
        readonly Destination: string;
    }
}

export interface DockerVolumeInspection extends DockerObject {
    readonly Driver?: VolumeDriverType;

    readonly Id: undefined; // Not defined for volumes
    readonly Description?: string;
    readonly Containers?: VolumeInspectionContainers; // Not a real part of volume inspection, but we add it because it's desperately needed
}
