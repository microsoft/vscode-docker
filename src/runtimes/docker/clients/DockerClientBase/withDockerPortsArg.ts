/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PortBinding } from "../../contracts/ContainerClient";
import { withNamedArg } from "../../utils/commandLineBuilder";

export function withDockerPortsArg(ports?: Array<PortBinding>) {
    return withNamedArg(
        '--publish',
        (ports || []).map((port) => {
            let binding = port.hostIp ? `${port.hostIp}:` : '';
            binding += `${port.hostPort || ''}:`;
            binding += port.containerPort;
            if (port.protocol) {
                binding += `/${port.protocol}`;
            }
            return binding;
        }),
    );
}
