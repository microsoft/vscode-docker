/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PortBinding } from "../../contracts/ContainerClient";

/**
 * Attempt to parse a Docker-like raw port binding string
 * @param portString the raw port string to parse, e.g. "1234/tcp" or "0.0.0.0:1234->1234/udp"
 * @returns Parsed raw port string as a PortBinding record or undefined if invalid
 */
export function parseDockerRawPortString(portString: string): PortBinding | undefined {
    const portRegex = /((?<hostIp>[\da-f.:[\]]+)(:(?<hostPort>\d+)))?(\s*->\s*)?((?<containerPort>\d+)\/(?<protocol>tcp|udp))/i;
    const result = portRegex.exec(portString);

    if (!result || !result.groups) {
        return undefined;
    }

    const hostIp = result.groups['hostIp'] || undefined;
    const hostPort = result.groups['hostPort'] ? Number.parseInt(result.groups['hostPort']) : undefined;
    const containerPort = result.groups['containerPort'] ? Number.parseInt(result.groups['containerPort']) : undefined;
    const protocol = result.groups['protocol'] || undefined;

    if (containerPort === undefined || (protocol !== 'tcp' && protocol !== 'udp')) {
        return undefined;
    }

    return {
        hostIp,
        hostPort,
        containerPort,
        protocol,
    };
}
