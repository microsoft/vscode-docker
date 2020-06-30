/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export type DockerOSType = 'linux' | 'windows';

export interface DockerInfo {
    readonly OSType: DockerOSType;
}

export interface PruneResult {
    readonly ObjectsDeleted: number;
    readonly SpaceReclaimed: number;
}

export interface DockerObject {
    readonly Id: string;
    readonly Name: string;
    readonly CreatedTime: number;
}
