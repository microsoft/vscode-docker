/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export type DockerInspectContainerPortHost = {
    HostIp?: string;
    HostPort?: number;
};

export type DockerInspectContainerBindMount = {
    Type: 'bind';
    Source: string;
    Destination: string;
    RW: boolean;
};

export type DockerInspectContainerVolumeMount = {
    Type: 'volume';
    Name: string;
    Source: string;
    Destination: string;
    Driver: string;
    RW: boolean;
};

export type DockerInspectContainerMount =
    | DockerInspectContainerBindMount
    | DockerInspectContainerVolumeMount;

export type DockerInspectNetwork = {
    Gateway: string;
    IPAddress: string;
    MacAddress: string;
};

export type DockerInspectContainerRecord = {
    Id: string;
    Name: string;
    ImageId: string;
    ImageName: string;
    Status: string;
    Platform: string;
    Entrypoint: Array<string> | string | null;
    Command: Array<string> | string | null;
    CWD: string;
    EnvVars: Array<string> | null;
    Networks: Record<string, DockerInspectNetwork> | null;
    IP: string | null;
    Ports: Record<string, Array<DockerInspectContainerPortHost>> | null;
    PublishAllPorts: boolean;
    Mounts: Array<DockerInspectContainerMount>;
    Labels: Record<string, string> | null;
    CreatedAt: string;
    StartedAt: string;
    FinishedAt: string;
    Raw: string;
};

// TODO: Actually test properties
export function isDockerInspectContainerRecord(maybeContainer: unknown): maybeContainer is DockerInspectContainerRecord {
    return true;
}
