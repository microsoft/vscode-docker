/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export type DockerOSType = 'linux' | 'windows';

export interface DockerInfo {
    readonly OSType: DockerOSType;
    readonly OperatingSystem: string;
}

export interface PruneResult {
    readonly ObjectsDeleted: number;
    readonly SpaceReclaimed: number;
}

// Note: a few of the inheriting objects remove some of these properties
// e.g. contexts do not have CreatedTime, volumes do not have Id, etc.
export interface DockerObject {
    readonly Id: string;
    readonly Name: string;
    readonly CreatedTime: number;
}
