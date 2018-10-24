/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { isLinux } from "../../helpers/osVersion";
import { wrapError } from "./wrapError";

const connectionMessage = 'Unable to connect to Docker, is the Docker daemon running?';

export namespace internal {
    // Exported for testing
    export const connectionUrl = 'https://docs.docker.com/install/linux/linux-postinstall/';
}

export function getDockerConnectionError(error?: unknown): unknown {
    let message = connectionMessage;

    if (isLinux()) {
        message = `${message} Please make sure you've followed the instructions in "Manage Docker as a non-root user" at ${internal.connectionUrl}.`;
    }

    return wrapError(error, message);
}
