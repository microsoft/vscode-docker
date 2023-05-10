/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Return a normalized string for the OS name specifically for Docker
 * @param os pre-normalized OS name
 * @returns normalized OS name
 */
export function getContainerOSFromPlatformOS(os?: string): ContainerOS {
    switch (os || 'Linux') {
        case 'Windows':
            return 'windows';
        case 'Mac':
            return 'darwin';
        case 'Linux':
        default:
            return 'linux';
    }
}

export const AllContainerOS = [
    'linux',
    'windows',
    'darwin'
] as const;

export type ContainerOS = typeof AllContainerOS[number];

