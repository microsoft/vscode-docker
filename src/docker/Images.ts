/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DockerObject } from './Common';

export interface DockerImage extends DockerObject {
    readonly RepoDigests?: string[];
    readonly Size?: number;
}

export interface ImageInspectionContainers {
    [containerId: string]: {
        readonly Name: string;
    };
}

export interface DockerImageInspection extends DockerObject {
    readonly Config?: {
        readonly ExposedPorts?: { readonly [portAndProtocol: string]: unknown; };
        readonly User?: string;
    };

    readonly RepoDigests?: string[];

    readonly Os: string;
    readonly Name: undefined; // Not defined for inspection
    readonly Containers?: ImageInspectionContainers; // Not a real part of image inspection, but we add it because it's desperately needed
}
