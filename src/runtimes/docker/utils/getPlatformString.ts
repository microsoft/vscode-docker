/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerPlatform } from "..";

/**
 * This method parses the `platform` field in tasks.json
 * @returns Platform string specified by `platform`
 */
export function getPlatformString(platform: ContainerPlatform): string | undefined {
    return platform ? `${platform.os}/${platform.architecture}` : undefined;
}
