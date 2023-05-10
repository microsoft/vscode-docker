/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Return a normalized string for the OS name specifically for Docker
 * @param os pre-normalized OS name
 * @returns normalized OS name
 */
export function normalizeContainerOS(os?: string): ContainerOS {
    switch (os?.toLocaleLowerCase() || 'linux') {
        case 'windows':
            return 'windows';
        case 'mac':
            return 'darwin';
        case 'linux':
        default:
            return 'linux';
    }
}

export type ContainerOS =
    | 'linux'
    | 'windows'
    | 'darwin';

