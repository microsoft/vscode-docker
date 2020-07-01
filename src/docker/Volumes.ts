/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DockerObject } from './Common';

export type VolumeDriverType = string;

export interface DockerVolume extends DockerObject {
    readonly Driver: VolumeDriverType;

    readonly Id: undefined; // Not defined for volumes
}

export interface DockerVolumeInspection extends DockerObject {
    readonly Driver: VolumeDriverType;

    readonly Id: undefined; // Not defined for volumes
}
