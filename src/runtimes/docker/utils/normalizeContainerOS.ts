/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Return a normalized string for the OS name specifically for Docker
 * @param os pre-normalized OS name
 * @returns normalized OS name
 */
export function normalizeContainerOS(os?: string): string {
    os = os?.toLowerCase() || 'linux'; // default to linux if not specified (null/undefined or empty string)
    switch (os) {
        case 'win':
            return 'windows';
        case 'osx':
        case 'mac':
        case 'macos':
            return 'darwin';
        default:
            return os;
    }
}

