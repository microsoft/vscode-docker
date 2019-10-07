/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as cp from 'child_process';
import { DockerOptions } from 'dockerode';

const unix = 'unix://';
const npipe = 'npipe://';

// Not exhaustive--only the properties we're interested in
interface IDockerEndpoint {
    Host?: string;
}

// Also not exhaustive--only the properties we're interested in
interface IDockerContext {
    Endpoints: { [key: string]: IDockerEndpoint }
}

export function tryGetDefaultDockerContext(): DockerOptions {
    try {
        const stdout = cp.execSync('docker context inspect', { timeout: 5000 }).toString();
        const dockerContexts = <IDockerContext[]>JSON.parse(stdout);
        const defaultHost: string =
            dockerContexts &&
            dockerContexts.length > 0 &&
            dockerContexts[0].Endpoints &&
            dockerContexts[0].Endpoints.docker &&
            dockerContexts[0].Endpoints.docker.Host;

        if (defaultHost.indexOf(unix) === 0) {
            return {
                socketPath: defaultHost.substring(unix.length), // Everything after the unix:// (expecting unix:///var/run/docker.sock)
            };
        } else if (defaultHost.indexOf(npipe) === 0) {
            return {
                socketPath: defaultHost.substring(npipe.length), // Everything after the npipe:// (expecting npipe:////./pipe/docker_engine or npipe:////./pipe/docker_wsl)
            };
        }
    } catch { } // Best effort

    // We won't try harder than that; for more complicated scenarios user will need to set DOCKER_HOST etc. in environment or VSCode options
    return undefined;
}
