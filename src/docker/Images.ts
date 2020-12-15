/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DockerObject } from './Common';

export interface DockerImage extends DockerObject {
    readonly RepoDigests?: string[];
    readonly Size?: number;
}

export interface DockerImageInspection extends DockerObject {
    readonly Config?: {
        readonly ExposedPorts?: { readonly [portAndProtocol: string]: unknown; };
        readonly Image?: string;
    };

    readonly Os: string;
    readonly Name: undefined; // Not defined for inspection
}
