/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerPlatform } from "../contracts/ContainerClient";

/**
 * Normalizes a platform string or object to a standardized `ContainerPlatform` object.
 *
 * @param platform The platform string or object to normalize.
 * @returns A standardized `ContainerPlatform` object.
 * @throws An error if the platform string is malformed.
 */
export function normalizePlatform(platform: string | ContainerPlatform): ContainerPlatform {

    if (platform && typeof platform === 'string') {
        const [os, ...architectureParts] = platform.split('/');
        const architecture = architectureParts.join('/');

        if (!os || !architecture) {
            throw new Error('Platform string is malformed. It should be in the format "{os}/{architecture}".');
        }

        return { os, architecture };
    }

    return platform as ContainerPlatform || {};
}

