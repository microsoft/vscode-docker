/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerPlatform } from "../../contracts/ContainerClient";
import { withNamedArg } from "../../utils/commandLineBuilder";
import { getNativeArchitecture } from "../../utils/getNativeArchitecture";
import { normalizeContainerOS } from "../../utils/normalizeContainerOS";

export function formatDockerPlatform(platform: ContainerPlatform): string | undefined {
    if (!platform?.os && !platform?.architecture) {
        return undefined;
    }
    const os = normalizeContainerOS(platform?.os);
    const architecture = platform?.architecture || getNativeArchitecture();

    return `${os}/${architecture}`;
}

/**p
 * This method formats the `platform` flag for the Docker CLI.
 *
 * The `os` and `architecture` properties are extracted and used to create a new `ContainerPlatform`
 * object. If either property is missing, a default value ofp `'linux'` for `os` or the result of
 * `getNativeArchitecture()` for `architecture` is used.
 *
 * If an empty object is passed in, `undefined` is returned, which will allow the Docker CLI to
 * skip the `--platform` flag entirely and use the default platform.
 *
 * @param platform
 * @returns
 */
export function withDockerPlatformArg(platform: ContainerPlatform) {
    return withNamedArg('--platform', formatDockerPlatform(platform));
}
