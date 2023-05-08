/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { l10n } from "vscode";
import { BuildImageCommandOptions } from "../../contracts/ContainerClient";

/**
 * This method parses the `platform` field in tasks.json
 * @returns Platform string specified by `platform`
 */
export function getPlatformString(options: BuildImageCommandOptions): string {
    const platform = options?.platform;

    if (!platform) {
        throw new Error(l10n.t("Platform is not specified."));
    }

    if (typeof platform === "string") {
        return platform;
    } else {
        const os = platform.os ?? "";
        const architecture = platform.architecture ?? "";

        if (!os || !architecture) {
            throw new Error(l10n.t("Platform is missing `os` or `architecture` or both properties."));
        }

        return `${os}/${architecture}`;
    }
}
