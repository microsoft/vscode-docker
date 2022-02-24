/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DockerOSType, DockerObject } from './Common';

export interface DockerPort {
    readonly IP?: string;
    readonly PrivatePort?: number;
    readonly PublicPort?: number;
    readonly Type?: string;
}

// Ports from inspect have a different shape entirely
export interface InspectionPort {
    readonly HostIp?: string;
    readonly HostPort?: string;
}

export interface DockerContainer extends DockerObject {
    readonly State: string;
    readonly Status: string;
    readonly Image: string;
    readonly ImageID: string;
    readonly NetworkSettings?: {
        readonly Networks?: { readonly [networkName: string]: unknown };
    };
    readonly Ports?: DockerPort[];
    readonly Labels?: {
        readonly [key: string]: string;
    }
}

export interface DockerContainerInspection extends DockerObject {
    readonly HostConfig?: {
        readonly Isolation?: string;
    };
    readonly NetworkSettings?: {
        readonly Ports?: {
            readonly [portAndProtocol: string]: InspectionPort[];
        };
    };
    readonly Platform?: DockerOSType;
}
