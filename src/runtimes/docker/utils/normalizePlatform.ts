/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerPlatform } from "../../../tasks/DockerBuildTaskDefinitionBase";
import { getNativeArchitecture } from "./getNativeArchitecture";

/**
 * Normalizes a platform string or object to a standardized `ContainerPlatform` object.
 *
 * If a string is passed in, the string is split into `os` and `architecture` components,
 * which are used to create a new `ContainerPlatform` object. If either component is missing,
 * a default value of `'linux'` for `os` or the result of `getNativeArchitecture()` for
 * `architecture` is used.
 *
 * If an object is passed in, the `os` and `architecture` properties are extracted and used
 * to create a new `ContainerPlatform` object. If either property is missing, a default value
 * of `'linux'` for `os` or the result of `getNativeArchitecture()` for `architecture` is used.
 *
 * @param platform The platform string or object to normalize.
 * @returns A standardized `ContainerPlatform` object.
 * @throws An error if the platform string is malformed.
 */
export function normalizePlatform(platform: string | ContainerPlatform): ContainerPlatform {

    if (isPlatformEmpty(platform)) {
        return undefined;
    }
    else if (typeof platform === 'string') {
        if (!isValidString(platform)) {
            throw new Error("Platform string is malformed. It should be in the format of '{os}/{architecture}'.");
        }

        const [os = 'linux', architecture = getNativeArchitecture()] = platform.split('/');
        return { os, architecture };
    }
    else {
        const { os = 'linux', architecture = getNativeArchitecture() } = platform;
        return { os, architecture };
    }

}

/**
 * The function determines whether a string is valid (not malformed). A string is valid if it
 * contains a single '/' and if there are letters on both sides of the '/'
 *
 * @param platform
 * @returns true is string is valid, false otherwise
 */
function isValidString(platform: string): boolean {
    const slashIndex = platform.indexOf('/');
    return slashIndex !== -1 && slashIndex !== 0 && slashIndex !== platform.length - 1;
}

/**
 * The function determines whether a platform object/string is empty. A platform object/string is empty
 * if it's one of the three:
 * 1. undefined
 * 2. both os and architecture are undefined
 * 3. empty string
 *
 * @param platform Platform object/string specified by `platform`
 * @returns true if platform object is empty, false otherwise
 */
function isPlatformEmpty(platform: string | ContainerPlatform): boolean {
    if (typeof platform === 'string') {
        return !platform;
    }
    return !platform?.os && !platform?.architecture;
}

