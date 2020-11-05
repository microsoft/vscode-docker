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
    readonly ContextType: ContextType;

    readonly Id: string; // Will be equal to Name for contexts

    readonly CreatedTime: undefined; // Not defined for contexts
}

export interface DockerContextInspection {
    readonly [key: string]: unknown;
}

export function isNewContextType(contextType: ContextType): boolean {
    switch (contextType) {
        case 'moby':
            return false;
        case 'aci': // ACI is new
        default: // Anything else is likely a new context type as well
            return true;
    }
}
