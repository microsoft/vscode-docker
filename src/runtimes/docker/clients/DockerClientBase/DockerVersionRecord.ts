/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export type DockerVersionRecord = {
    Client: { ApiVersion: string };
    Server: { ApiVersion: string };
};

export function isDockerVersionRecord(maybeVersion: unknown): maybeVersion is DockerVersionRecord {
    const version = maybeVersion as DockerVersionRecord;

    if (typeof version?.Client?.ApiVersion !== 'string') {
        return false;
    }

    if (typeof version?.Server?.ApiVersion !== 'string') {
        return false;
    }

    return true;
}
