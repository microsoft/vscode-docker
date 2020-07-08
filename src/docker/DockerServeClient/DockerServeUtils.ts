/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Container } from '@docker/sdk/containers';
import { DockerContainer, InspectionPort } from '../Containers';

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
        const [label, value] = l.split('=');
        labels[label] = value;
    });

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
