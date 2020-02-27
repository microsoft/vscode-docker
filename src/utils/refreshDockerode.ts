/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import Dockerode = require('dockerode');
import { DockerOptions } from 'dockerode';
import { Socket } from 'net';
import { CancellationTokenSource } from 'vscode';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { addDockerSettingsToEnv } from './addDockerSettingsToEnv';
import { cloneObject } from './cloneObject';
import { delay } from './delay';
import { isWindows } from './osUtils';
import { execAsync } from './spawnAsync';

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
            SSH_URL_REGEX.test(newEnv.DOCKER_HOST)) {
            // If DOCKER_HOST is an SSH URL, we need to configure / validate SSH_AUTH_SOCK for Dockerode
            // Other than that, we use default settings, so return undefined
            if (!await validateSshAuthSock(newEnv)) {
                // Don't wait
                /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
                ext.ui.showWarningMessage(localize('vscode-docker.utils.dockerode.sshAgent', 'In order to use an SSH DOCKER_HOST, you must configure an ssh-agent.'), { learnMoreLink: 'https://aka.ms/AA7assy' });
            }

            return undefined;
        } else if (!newEnv.DOCKER_HOST) {
            // If DOCKER_HOST is unset, try to get default Docker context--this helps support WSL
            return await getDefaultDockerContext();
        }
    } catch { } // Best effort only

    // Use default options
    return undefined;
}

async function validateSshAuthSock(newEnv: NodeJS.ProcessEnv): Promise<boolean> {
    if (!newEnv.SSH_AUTH_SOCK && isWindows()) {
        // On Windows, we can use this one by default
        newEnv.SSH_AUTH_SOCK = '\\\\.\\pipe\\openssh-ssh-agent';
    } else if (!newEnv.SSH_AUTH_SOCK) {
        // On Mac and Linux, if SSH_AUTH_SOCK isn't set there's nothing we can do
        // Running ssh-agent would yield a new agent that doesn't have the needed keys
        return false;
    }

    const authSock = new Socket();
    const cts = new CancellationTokenSource();

    const connectPromise = new Promise<boolean>(resolve => {
        authSock.on('error', (err) => {
            cts.cancel();
            resolve(false);
        });

        authSock.on('connect', () => {
            cts.cancel();
            resolve(true);
        });

        authSock.connect(newEnv.SSH_AUTH_SOCK);
    });

    // Unfortunately Socket.setTimeout() does not actually work when attempting to establish a connection, so we need to race
    return await Promise.race([connectPromise, delay(1000, cts.token).then(() => false)])
        .finally(() => {
            authSock.end();
            cts.dispose();
        });
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
