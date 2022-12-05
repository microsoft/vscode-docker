/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ListNetworkItem } from '../../contracts/ContainerClient';
import { dayjs } from '../../utils/dayjs';
import { parseDockerLikeLabels } from './parseDockerLikeLabels';

export type DockerListNetworkRecord = {
    ID: string;
    Name: string;
    Driver: string;
    Labels: string;
    Scope: string;
    IPv6: string;
    CreatedAt: string;
    Internal: string;
};

export function isDockerListNetworkRecord(maybeNetwork: unknown): maybeNetwork is DockerListNetworkRecord {
    const network = maybeNetwork as DockerListNetworkRecord;

    if (!network || typeof network !== 'object') {
        return false;
    }

    if (typeof network.ID !== 'string') {
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

export function normalizeDockerListNetworkRecord(network: DockerListNetworkRecord): ListNetworkItem {
    // Parse the labels assigned to the networks and normalize to key value pairs
    const labels = parseDockerLikeLabels(network.Labels);

    const createdAt = dayjs.utc(network.CreatedAt).toDate();

    return {
        id: network.ID,
        name: network.Name,
        driver: network.Driver,
        labels,
        scope: network.Scope,
        ipv6: network.IPv6.toLowerCase() === 'true',
        internal: network.Internal.toLowerCase() === 'true',
        createdAt,
    };
}
