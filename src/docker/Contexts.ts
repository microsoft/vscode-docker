/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext } from '../extensionVariables';
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

// This method cannot be async and use `ext.dockerContextManager.getCurrentContextType()` like the below, because it is used internally by `DockerContextManager.refresh()`
export function isNewContextType(contextType: ContextType): boolean {
    switch (contextType) {
        case 'moby':
            return false;
        case 'aci': // ACI is new
        default: // Anything else is likely a new context type as well
            return true;
    }
}

export async function getComposeCliCommand(): Promise<string> {
    return isNewContextType(await ext.dockerContextManager.getCurrentContextType()) ? 'docker compose' : 'docker-compose';
}

// This method is needed because in certain scenarios--e.g. command customization--the compose command is defined by the user
// In order to support backwards compatibility, we rewrite the command, rather than building it correctly from the beginning with `getComposeCliCommand()`
export async function rewriteComposeCommandIfNeeded(command: string): Promise<string> {
    // Replace 'docker-compose' or 'docker compose' at the start of a string with the correct compose CLI command
    command = command.replace(/^docker(-|\s+)compose/i, await getComposeCliCommand());

    if (isNewContextType(await ext.dockerContextManager.getCurrentContextType())) {
        // For new contexts, replace '--build' anywhere with ''
        command = command.replace(/--build/i, '');
    }

    return command;
}
