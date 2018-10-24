/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { isLinux } from "../../helpers/osVersion";
import { wrapError } from "./wrapError";

const connectionMessage = 'Unable to connect to Docker, is the Docker daemon running?';

export namespace internal {
    // Exported for testing
    export const connectionUrl = 'https://github.com/Microsoft/vscode-docker#im-on-linux-and-get-the-error-unable-to-connect-to-docker-is-the-docker-daemon-running';
}

export function getDockerConnectionError(error?: unknown): unknown {
    let message = connectionMessage;

    if (isLinux()) {
        message = `${message} Please see ${internal.connectionUrl} for a possible cause and solution.`;
    }

    return wrapError(error, message);
}
