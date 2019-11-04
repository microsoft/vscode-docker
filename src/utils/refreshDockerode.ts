/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DockerOptions } from 'dockerode';
import Dockerode = require('dockerode');
import { ext } from '../extensionVariables';
import { addDockerSettingsToEnv } from './addDockerSettingsToEnv';
import { cloneObject } from './cloneObject';
import { execAsync } from './execAsync';
import { isWindows } from './osUtils';

const unix = 'unix://';
const npipe = 'npipe://';

const SSH_URL_REGEX = /ssh:\/\//i;

// Not exhaustive--only the properties we're interested in
interface IDockerEndpoint {
    Host?: string;
}

// Also not exhaustive--only the properties we're interested in
interface IDockerContext {
    Endpoints: { [key: string]: IDockerEndpoint }
}

/**
 * Dockerode parses and handles the well-known `DOCKER_*` environment variables, but it doesn't let us pass those values as-is to the constructor
 * Thus we will temporarily update `process.env` and pass nothing to the constructor
 */
export async function refreshDockerode(): Promise<void> {
    try {
        const oldEnv = process.env;
        const newEnv: NodeJS.ProcessEnv = cloneObject(process.env); // make a clone before we change anything
        addDockerSettingsToEnv(newEnv, oldEnv);

        const dockerodeOptions = await getDockerodeOptions(newEnv);

        ext.dockerodeInitError = undefined;
        process.env = newEnv;
        try {
            ext.dockerode = new Dockerode(dockerodeOptions);
        } finally {
            process.env = oldEnv;
        }
    } catch (error) {
        // This will be displayed in the tree
        ext.dockerodeInitError = error;
    }
}

async function getDockerodeOptions(newEnv: NodeJS.ProcessEnv): Promise<DockerOptions | undefined> {
    // By this point any DOCKER_HOST from VSCode settings is already copied to process.env, so we can use it directly

    try {
        if (newEnv.DOCKER_HOST &&
            SSH_URL_REGEX.test(newEnv.DOCKER_HOST) &&
            !newEnv.SSH_AUTH_SOCK) {
            // If DOCKER_HOST is an SSH URL, we need to configure SSH_AUTH_SOCK for Dockerode
            // Other than that, we use default settings, so return undefined
            newEnv.SSH_AUTH_SOCK = await getSshAuthSock();
            return undefined;
        } else if (!newEnv.DOCKER_HOST) {
            // If DOCKER_HOST is unset, try to get default Docker context--this helps support WSL
            return await getDefaultDockerContext();
        }
    } catch { } // Best effort only

    // Use default options
    return undefined;
}

async function getSshAuthSock(): Promise<string | undefined> {
    if (isWindows()) {
        return '\\\\.\\pipe\\openssh-ssh-agent';
    } else {
        // On Mac and Linux, if SSH_AUTH_SOCK isn't set there's nothing we can do
        // Running ssh-agent would yield a new agent that doesn't have the needed keys
        await ext.ui.showWarningMessage('In order to use an SSH DOCKER_HOST on OS X and Linux, you must configure an ssh-agent.');
    }
}

async function getDefaultDockerContext(): Promise<DockerOptions | undefined> {
    const { stdout } = await execAsync('docker context inspect', { timeout: 5000 });
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
    } else {
        return undefined;
    }
}
