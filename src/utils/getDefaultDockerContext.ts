/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as cp from 'child_process';
import { DockerOptions } from 'dockerode';
import * as util from 'util';

const exec = util.promisify(cp.exec);

export async function getDefaultDockerContext(): Promise<DockerOptions | undefined> {
    try {
        const { stdout, stderr } = await exec('docker context inspect');

        if (stderr) {
            throw new Error(stderr);
        }

        if (!stdout) {
            return undefined;
        }

        const dockerContext = JSON.parse(stdout);
        // tslint:disable: no-unsafe-any
        const host: string =
            Array.isArray(dockerContext) && dockerContext.length > 0 &&
            dockerContext[0].Endpoints &&
            dockerContext[0].Endpoints.docker &&
            dockerContext[0].Endpoints.docker.Host;
        // tslint:enable: no-unsafe-any

        if (host.indexOf('unix://') === 0) {
            return {
                socketPath: host.substring(7), // Everything after the unix:// (expecting unix:///var/run/docker.sock)
            }
        } else if (host.indexOf('npipe://') === 0) {
            return {
                socketPath: host.substring(8), // Everything after the npipe:// (expecting npipe:////./pipe/docker_engine or npipe:////./pipe/docker_wsl)
            }
        }

        // We won't try harder than that; for more complicated scenarios user will need to set DOCKER_HOST etc. in environment or VSCode options
    } catch { } // Best effort

    return undefined;
}
