/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Container } from '@docker/sdk/containers';
import { DockerContainer, InspectionPort } from '../Containers';

// Group 1 is container group name; group 2 is container name
const containerGroupAndName = /(?:([a-z0-9\-]+)_)?([a-z0-9\-]+)/i;

export function containerToDockerContainer(container: Container.AsObject): DockerContainer | undefined {
    if (!container) {
        return undefined;
    }

    const ports = container.portsList.map(p => {
        return {
            IP: p.hostIp,
            PublicPort: p.hostPort,
            PrivatePort: p.containerPort,
            Type: p.protocol,
        };
    });

    const labels: { [key: string]: string } = {};
    container.labelsList.forEach(l => {
        const [label, value] = l.split(/=|:/i);
        labels[label] = value;
    });

    // If the containers are in a group and there's no com.docker.compose.project label,
    // use the group name as that label so that grouping in the UI works
    let match: string;
    if (labels['com.docker.compose.project'] === undefined &&
        (match = containerGroupAndName.exec(container.id)?.[1])) { // Assignment and check is intentional
        labels['com.docker.compose.project'] = match;
    }

    return {
        Id: container.id,
        Image: container.image,
        Name: container.id, // TODO ?
        State: container.status,
        Status: container.status,
        ImageID: undefined, // TODO ?
        CreatedTime: undefined, // TODO ?
        Labels: labels, // TODO--not yet supported on ACI
        Ports: ports,
    };
}

export function containerPortsToInspectionPorts(container: DockerContainer): { [portAndProtocol: string]: InspectionPort[] } | undefined {
    if (container?.Ports === undefined) {
        return undefined;
    }

    const result: { [portAndProtocol: string]: InspectionPort[] } = {};

    for (const port of container.Ports) {
        // Get the key
        const key = `${port.PrivatePort}/${port.Type}`;

        // If there's no entries for this key yet, create an empty list
        if (result[key] === undefined) {
            result[key] = [];
        }

        // Add the value to the list
        result[key].push({
            HostIp: port.IP,
            HostPort: port.PublicPort.toString(),
        });
    }

    return result;
}
