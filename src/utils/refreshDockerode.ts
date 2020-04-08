/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import Dockerode = require('dockerode');
import { Socket } from 'net';
import { CancellationTokenSource } from 'vscode';
import { parseError } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { addDockerSettingsToEnv } from './addDockerSettingsToEnv';
import { cloneObject } from './cloneObject';
import { delay } from './delay';
import { dockerContextManager, IDockerContext } from './dockerContextManager';
import { isWindows } from './osUtils';

const SSH_URL_REGEX = /ssh:\/\//i;

/**
 * Dockerode parses and handles the well-known `DOCKER_*` environment variables, but it doesn't let us pass those values as-is to the constructor
 * Thus we will temporarily update `process.env` and pass nothing to the constructor
 */
export async function refreshDockerode(): Promise<void> {
    try {
        const oldEnv = process.env;
        const newEnv: NodeJS.ProcessEnv = cloneObject(process.env); // make a clone before we change anything
        addDockerSettingsToEnv(newEnv, oldEnv);
        await addDockerHostToEnv(newEnv);

        ext.dockerodeInitError = undefined;
        process.env = newEnv;
        try {
            ext.dockerode = new Dockerode();
        } finally {
            process.env = oldEnv;
        }
    } catch (error) {
        // This will be displayed in the tree
        ext.dockerodeInitError = error;
    }
}

async function addDockerHostToEnv(newEnv: NodeJS.ProcessEnv): Promise<void> {
    let dockerContext: IDockerContext;

    try {
        ({ Context: dockerContext } = await dockerContextManager.getCurrentContext());

        if (!newEnv.DOCKER_HOST) {
            newEnv.DOCKER_HOST = dockerContext?.Endpoints.docker.Host;
        }

        if (!newEnv.DOCKER_TLS_VERIFY && dockerContext?.Endpoints.docker.SkipTLSVerify) {
            // https://docs.docker.com/compose/reference/envvars/#docker_tls_verify
            newEnv.DOCKER_TLS_VERIFY = "";
        }
    } catch (error) {
        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        ext.ui.showWarningMessage(localize('vscode-docker.utils.dockerode.dockerContextUnobtainable', 'Docker context could not be retrieved.') + ' ' + parseError(error).message);
    }

    if (newEnv.DOCKER_HOST && SSH_URL_REGEX.test(newEnv.DOCKER_HOST)) {
        // If DOCKER_HOST is an SSH URL, we need to configure / validate SSH_AUTH_SOCK for Dockerode
        // Other than that, we use default settings, so return undefined
        if (!await validateSshAuthSock(newEnv)) {
            // Don't wait
            /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
            ext.ui.showWarningMessage(localize('vscode-docker.utils.dockerode.sshAgent', 'In order to use an SSH DOCKER_HOST, you must configure an ssh-agent.'), { learnMoreLink: 'https://aka.ms/AA7assy' });
        }
    }
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
