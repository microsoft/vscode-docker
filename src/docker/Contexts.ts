/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DockerObject } from './Common';

export type ContextType = 'aci' | 'moby';

export interface DockerContext extends DockerObject {
    readonly Description?: string;
    readonly DockerEndpoint: string;
    readonly Current: boolean;
    readonly Type: ContextType;

    readonly Id: string; // Will be equal to Name for contexts

    readonly CreatedTime: undefined; // Not defined for contexts
}

export interface DockerContextInspection {
    readonly [key: string]: unknown;
}

export function isUplevelContextType(contextType: ContextType): boolean {
    switch (contextType) {
        case 'aci':
            return true;
        default:
            return false;
    }
}
