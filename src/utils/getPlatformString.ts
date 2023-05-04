/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BuildImageCommandOptions } from "../runtimes/docker/contracts/ContainerClient";

/**
 * This method parses the `platform` field in tasks.json
 * @returns Platform string specified by `platform`
 */
export function getPlatformString(options: BuildImageCommandOptions): string {
    const platform = options.platform;
    if (typeof platform === "string") {
        return platform;
    } else {
        const os = platform.os ?? "";
        const architecture = platform.architecture ?? "";
        return `${os}/${architecture}`;
    }
}
