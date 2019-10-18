/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DockerOptions } from 'dockerode';
import Dockerode = require('dockerode');
import { ext } from '../extensionVariables';
import { addDockerSettingsToEnv } from './addDockerSettingsToEnv';
import { exec } from './exec';
import { isWindows } from './osUtils';

const unix = 'unix://';
const npipe = 'npipe://';

const SSH_URL_REGEX = /ssh:\/\//i;
const SSH_AUTH_SOCK_REGEX = /SSH_AUTH_SOCK\s*=\s*([^;]+)/gim;

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
    const oldEnv = process.env;
    try {
        process.env = { ...process.env }; // make a clone before we change anything
        addDockerSettingsToEnv(process.env, oldEnv);
        ext.dockerodeInitError = undefined;
        ext.dockerode = new Dockerode(await getDockerodeOptions());
    } catch (error) {
        // This will be displayed in the tree
        ext.dockerodeInitError = error;
    } finally {
        process.env = oldEnv;
    }
}

async function getDockerodeOptions(): Promise<DockerOptions | undefined> {
    // By this point any DOCKER_HOST from VSCode settings is already copied to process.env, so we can use it directly

    try {
        if (process.env.DOCKER_HOST &&
            SSH_URL_REGEX.test(process.env.DOCKER_HOST) &&
            !process.env.SSH_AUTH_SOCK) {
            // If DOCKER_HOST is an SSH URL, we need to configure SSH_AUTH_SOCK for Dockerode
            // Other than that, we use default settings, so return undefined
            process.env.SSH_AUTH_SOCK = await getSshAuthSock();
            return undefined;
        } else if (!process.env.DOCKER_HOST) {
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
        const { stdout } = await exec('ssh-agent -s', { timeout: 1000 });
        const matches = SSH_AUTH_SOCK_REGEX.exec(stdout);

        return matches && matches.length > 1 && matches[1] || undefined;
    }
}

async function getDefaultDockerContext(): Promise<DockerOptions | undefined> {
    const { stdout } = await exec('docker context inspect', { timeout: 5000 });
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
