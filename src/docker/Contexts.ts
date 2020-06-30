/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DockerObject } from './Common';

export interface DockerContext extends DockerObject {
    readonly Description?: string;
    readonly DockerEndpoint: string;
    readonly Current: boolean;

    readonly Id: undefined; // Not defined for contexts
    readonly CreatedTime: undefined; // Not defined for contexts
}

export interface DockerContextInspection {
    readonly [key: string]: unknown;
}
