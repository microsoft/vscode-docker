/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as Dockerode from 'dockerode';
import { Socket } from 'net';
import { CancellationTokenSource, MessageItem, Uri, env, window, workspace } from 'vscode';
import { localize } from '../../localize';
import { addDockerSettingsToEnv } from '../../utils/addDockerSettingsToEnv';
import { cloneObject } from '../../utils/cloneObject';
import { isWindows } from '../../utils/osUtils';
import { TimeoutPromiseSource } from '../../utils/promiseUtils';
import { DockerContext } from '../Contexts';

export function getFullTagFromDigest(image: Dockerode.ImageInfo): string {
    let repo = '<none>';
    const tag = '<none>';

    const digest = image.RepoDigests[0];
    if (digest) {
        const index = digest.indexOf('@');
        if (index > 0) {
            repo = digest.substring(0, index);
        }
    }

    return `${repo}:${tag}`;
}

export function getContainerName(containerInfo: Dockerode.ContainerInfo): string {
    const names = containerInfo.Names.map(name => name.substr(1)); // Remove start '/'

    // Linked containers may have names containing '/'; their one "canonical" names will not.
    const canonicalName = names.find(name => name.indexOf('/') === -1);

    return canonicalName ?? names[0];
}
const SSH_URL_REGEX = /ssh:\/\//i;

/**
 * Dockerode parses and handles the well-known `DOCKER_*` environment variables, but it doesn't let us pass those values as-is to the constructor
 * Thus we will temporarily update `process.env` and pass nothing to the constructor
 */
export function refreshDockerode(currentContext: DockerContext): Dockerode {
    // If the docker.dockerodeOptions setting is present, use it only
    const config = workspace.getConfiguration('docker');
    const overrideDockerodeOptions = config.get('dockerodeOptions');
    if (overrideDockerodeOptions && Object.keys(overrideDockerodeOptions).length > 0) {
        return new Dockerode(<Dockerode.DockerOptions>overrideDockerodeOptions);
    }

    // Set up environment variables
    const oldEnv = process.env;
    const newEnv: NodeJS.ProcessEnv = cloneObject(process.env); // make a clone before we change anything

    if (currentContext.Name === 'default') {
        // If the current context is default, just make use of addDockerSettingsToEnv + the current environment
        addDockerSettingsToEnv(newEnv, oldEnv);
    } else {
        // Otherwise get the host from the Docker context
        newEnv.DOCKER_HOST = currentContext.DockerEndpoint;
    }

    // If host is an SSH URL, we need to configure / validate SSH_AUTH_SOCK for Dockerode
    if (newEnv.DOCKER_HOST && SSH_URL_REGEX.test(newEnv.DOCKER_HOST)) {
        if (!newEnv.SSH_AUTH_SOCK && isWindows()) {
            // On Windows, we can use this one by default
            newEnv.SSH_AUTH_SOCK = '\\\\.\\pipe\\openssh-ssh-agent';
        }

        // Don't wait
        void validateSshAuthSock(newEnv.SSH_AUTH_SOCK).then((result) => {
            if (!result) {
                // Normally we'd prefer IActionContext.ui.showWarningMessage but this occurs outside of any action, so no context.ui is available.
                const learnMore: MessageItem = {
                    title: localize('vscode-docker.utils.dockerode.sshAgentLearnMore', 'Learn More'),
                };

                // Don't wait
                void window.showWarningMessage(localize('vscode-docker.utils.dockerode.sshAgent', 'In order to use an SSH DOCKER_HOST, you must configure an ssh-agent.'), learnMore).then((result) => {
                    if (result === learnMore) {
                        void env.openExternal(Uri.parse('https://aka.ms/AA7assy'));
                    }
                });
            }
        });
    }

    try {
        process.env = newEnv;
        return new Dockerode();
    } finally {
        process.env = oldEnv;
    }
}

async function validateSshAuthSock(authSock: string): Promise<boolean> {
    if (!authSock) {
        // On Mac and Linux, if SSH_AUTH_SOCK isn't set there's nothing we can do
        // Running ssh-agent would yield a new agent that doesn't have the needed keys
        return false;
    }

    const socket = new Socket();
    const cts = new CancellationTokenSource();

    const connectPromise = new Promise<boolean>(resolve => {
        socket.on('error', (err) => {
            cts.cancel();
            resolve(false);
        });

        socket.on('connect', () => {
            cts.cancel();
            resolve(true);
        });

        socket.connect(authSock);
    });

    // Unfortunately Socket.setTimeout() does not actually work when attempting to establish a connection, so we need to race
    return await Promise.race([connectPromise, new TimeoutPromiseSource(1000).promise])
        .finally(() => {
            socket.end();
            cts.dispose();
        });
}
