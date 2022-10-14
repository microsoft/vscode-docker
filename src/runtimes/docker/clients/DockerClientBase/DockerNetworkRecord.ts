/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export type DockerNetworkRecord = {
    Id: string;
    Name: string;
    Driver: string;
    Labels: string;
    Scope: string;
    IPv6: string;
    CreatedAt: string;
    Internal: string;
};

export function isDockerNetworkRecord(maybeNetwork: unknown): maybeNetwork is DockerNetworkRecord {
    const network = maybeNetwork as DockerNetworkRecord;

    if (!network || typeof network !== 'object') {
        return false;
    }

    if (typeof network.Name !== 'string') {
        return false;
    }

    if (typeof network.Driver !== 'string') {
        return false;
    }

    if (typeof network.Labels !== 'string') {
        return false;
    }

    if (typeof network.Scope !== 'string') {
        return false;
    }

    if (typeof network.IPv6 !== 'string') {
        return false;
    }

    if (typeof network.CreatedAt !== 'string') {
        return false;
    }

    if (typeof network.Internal !== 'string') {
        return false;
    }

    return true;
}
