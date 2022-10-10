/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RunContainerExtraHost } from "../../contracts/ContainerClient";
import { withNamedArg } from "../../utils/commandLineBuilder";

export function formatAddHost(addHost: RunContainerExtraHost): string {
    return `${addHost.hostname}:${addHost.ip}`;
}

export function withDockerAddHostArg(addHosts?: Array<RunContainerExtraHost>) {
    return withNamedArg('--add-host', (addHosts || []).map(formatAddHost));
}
