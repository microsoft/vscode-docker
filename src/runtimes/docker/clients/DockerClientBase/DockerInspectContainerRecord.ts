/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { InspectContainersItem, InspectContainersItemMount, InspectContainersItemNetwork, PortBinding } from '../../contracts/ContainerClient';
import { dayjs } from '../../utils/dayjs';
import { toArray } from '../../utils/toArray';
import { parseDockerLikeEnvironmentVariables } from './parseDockerLikeEnvironmentVariables';
import { parseDockerLikeImageName } from './parseDockerLikeImageName';

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

export type DockerInspectContainerConfig = {
    Image: string;
    Status: string;
    Entrypoint: Array<string> | string | null;
    Cmd: Array<string> | string | null;
    Env?: Array<string> | null;
    Labels?: Record<string, string> | null;
    WorkingDir?: string | null;
};

export type DockerInspectContainerHostConfig = {
    PublishAllPorts?: boolean | null;
};

export type DockerInspectContainerNetworkSettings = {
    Networks?: Record<string, DockerInspectNetwork> | null;
    IPAddress?: string;
    Ports?: Record<string, Array<DockerInspectContainerPortHost>> | null;
};

export type DockerInspectContainerState = {
    Status?: string;
    StartedAt?: string;
    FinishedAt?: string;
};

export type DockerInspectContainerRecord = {
    Id: string;
    Name: string;
    Image: string;
    Platform: string;
    Created: string;
    Mounts: Array<DockerInspectContainerMount>;
    State: DockerInspectContainerState;
    Config: DockerInspectContainerConfig;
    HostConfig: DockerInspectContainerHostConfig;
    NetworkSettings: DockerInspectContainerNetworkSettings;
};

// TODO: Actually test properties
export function isDockerInspectContainerRecord(maybeContainer: unknown): maybeContainer is DockerInspectContainerRecord {
    return true;
}

export function normalizeDockerInspectContainerRecord(container: DockerInspectContainerRecord): InspectContainersItem {
    // Parse the environment variables assigned to the container at runtime
    const environmentVariables = parseDockerLikeEnvironmentVariables(container.Config?.Env || []);

    // Parse the networks assigned to the container and normalize to InspectContainersItemNetwork
    // records
    const networks = Object.entries(container.NetworkSettings?.Networks || {}).map<InspectContainersItemNetwork>(([name, dockerNetwork]) => {
        return {
            name,
            gateway: dockerNetwork.Gateway || undefined,
            ipAddress: dockerNetwork.IPAddress || undefined,
            macAddress: dockerNetwork.MacAddress || undefined,
        };
    });

    // Parse the exposed ports for the container and normalize to a PortBinding record
    const ports = Object.entries(container.NetworkSettings?.Ports || {}).map<PortBinding>(([rawPort, hostBinding]) => {
        const [port, protocol] = rawPort.split('/');
        return {
            hostIp: hostBinding?.[0]?.HostIp,
            hostPort: hostBinding?.[0]?.HostPort,
            containerPort: parseInt(port),
            protocol: protocol.toLowerCase() === 'tcp'
                ? 'tcp'
                : protocol.toLowerCase() === 'udp'
                    ? 'udp'
                    : undefined,
        };
    });

    // Parse the volume and bind mounts associated with the given runtime and normalize to
    // InspectContainersItemMount records
    const mounts = (container.Mounts || []).reduce<Array<InspectContainersItemMount>>((curMounts, mount) => {
        switch (mount?.Type) {
            case 'bind':
                return [...curMounts, {
                    type: 'bind',
                    source: mount.Source,
                    destination: mount.Destination,
                    readOnly: !mount.RW,
                }];
            case 'volume':
                return [...curMounts, {
                    type: 'volume',
                    name: mount.Name,
                    source: mount.Source,
                    destination: mount.Destination,
                    driver: mount.Driver,
                    readOnly: !mount.RW,
                }];
        }

    }, new Array<InspectContainersItemMount>());
    const labels = container.Config?.Labels ?? {};

    const createdAt = dayjs.utc(container.Created);
    const startedAt = container.State?.StartedAt
        ? dayjs.utc(container.State?.StartedAt)
        : undefined;
    const finishedAt = container.State?.FinishedAt
        ? dayjs.utc(container.State?.FinishedAt)
        : undefined;

    // Return the normalized InspectContainersItem record
    return {
        id: container.Id,
        name: container.Name,
        imageId: container.Image,
        image: parseDockerLikeImageName(container.Config.Image),
        status: container.State?.Status,
        environmentVariables,
        networks,
        ipAddress: container.NetworkSettings?.IPAddress ? container.NetworkSettings?.IPAddress : undefined,
        ports,
        mounts,
        labels,
        entrypoint: toArray(container.Config?.Entrypoint ?? []),
        command: toArray(container.Config?.Cmd ?? []),
        currentDirectory: container.Config?.WorkingDir || undefined,
        createdAt: createdAt.toDate(),
        startedAt: startedAt && (startedAt.isSame(createdAt) || startedAt.isAfter(createdAt))
            ? startedAt.toDate()
            : undefined,
        finishedAt: finishedAt && (finishedAt.isSame(createdAt) || finishedAt.isAfter(createdAt))
            ? finishedAt.toDate()
            : undefined,
        raw: JSON.stringify(container),
    };
}
