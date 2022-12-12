/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { InspectNetworksItem, NetworkIpamConfig } from '../../contracts/ContainerClient';
import { dayjs } from '../../utils/dayjs';

export type DockerIpamConfig = {
    Subnet: string;
    Gateway: string;
};

export type DockerIpam = {
    Driver: string;
    Config: Array<DockerIpamConfig>;
};

export type DockerInspectNetworkRecord = {
    Id: string;
    Name: string;
    Driver: string;
    Scope: string;
    Labels: Record<string, string>;
    IPAM: DockerIpam;
    EnableIPv6: boolean;
    Internal: boolean;
    Attachable: boolean;
    Ingress: boolean;
    Created: string;
};

export function isDockerInspectNetworkRecord(maybeNetwork: unknown): maybeNetwork is DockerInspectNetworkRecord {
    const network = maybeNetwork as DockerInspectNetworkRecord;

    if (!network || typeof network !== 'object') {
        return false;
    }

    if (typeof network.Id !== 'string') {
        return false;
    }

    if (typeof network.Name !== 'string') {
        return false;
    }

    if (typeof network.Scope !== 'string') {
        return false;
    }

    if (typeof network.Labels !== 'object') {
        return false;
    }

    if (network.IPAM === null || typeof network.IPAM !== 'object' || typeof network.IPAM.Driver !== 'string') {
        return false;
    }

    if (typeof network.EnableIPv6 !== 'boolean') {
        return false;
    }

    if (typeof network.Internal !== 'boolean') {
        return false;
    }

    if (typeof network.Attachable !== 'boolean') {
        return false;
    }

    if (typeof network.Ingress !== 'boolean') {
        return false;
    }

    if (typeof network.Created !== 'string') {
        return false;
    }

    return true;
}

export function normalizeDockerInspectNetworkRecord(network: DockerInspectNetworkRecord): InspectNetworksItem {
    const ipam: NetworkIpamConfig = {
        driver: network.IPAM.Driver,
        config: network.IPAM.Config.map(({ Subnet, Gateway }) => ({
            subnet: Subnet,
            gateway: Gateway,
        })),
    };

    const createdAt = dayjs.utc(network.Created).toDate();

    // Return the normalized InspectNetworksItem record
    return {
        id: network.Id,
        name: network.Name,
        driver: network.Driver,
        scope: network.Scope,
        labels: network.Labels || {},
        ipam,
        ipv6: network.EnableIPv6,
        internal: network.Internal,
        attachable: network.Attachable,
        ingress: network.Ingress,
        createdAt,
        raw: JSON.stringify(network),
    };
}
