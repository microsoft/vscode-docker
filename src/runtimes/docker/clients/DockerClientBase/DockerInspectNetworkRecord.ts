/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

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
    Ipam: DockerIpam;
    EnableIPv6: boolean;
    Internal: boolean;
    Attachable: boolean;
    Ingress: boolean;
    CreatedAt: string;
    Raw: string;
};

// TODO: Actually test properties
export function isDockerInspectNetworkRecord(maybeVolume: unknown): maybeVolume is DockerInspectNetworkRecord {
    return true;
}
