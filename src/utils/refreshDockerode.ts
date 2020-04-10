/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import Dockerode = require('dockerode');
import { Socket } from 'net';
import * as os from 'os';
import * as url from 'url';
import { CancellationTokenSource } from 'vscode';
import { callWithTelemetryAndErrorHandling, IActionContext } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { addDockerSettingsToEnv } from './addDockerSettingsToEnv';
import { cloneObject } from './cloneObject';
import { delay } from './delay';
import { dockerContextManager, IDockerContext } from './dockerContextManager';
import { isWindows } from './osUtils';
import { timeUtils } from './timeUtils';

const SSH_URL_REGEX = /ssh:\/\//i;

/**
 * Dockerode parses and handles the well-known `DOCKER_*` environment variables, but it doesn't let us pass those values as-is to the constructor
 * Thus we will temporarily update `process.env` and pass nothing to the constructor
 */
export async function refreshDockerode(): Promise<void> {
    await callWithTelemetryAndErrorHandling(
        ext.dockerode ? 'docker-context.change' : 'docker-context.initialize',
        async (actionContext: IActionContext) => {

            try {
                // Set up environment variables
                const oldEnv = process.env;
                const newEnv: NodeJS.ProcessEnv = cloneObject(process.env); // make a clone before we change anything
                addDockerSettingsToEnv(newEnv, oldEnv);

                let dockerContext: IDockerContext | undefined;
                const dockerodeOptions: Dockerode.DockerOptions = {};

                // If DOCKER_HOST is set in the process environment, the host source is environment
                if (oldEnv.DOCKER_HOST) {
                    actionContext.telemetry.properties.hostSource = 'env';
                } else if (newEnv.DOCKER_HOST) { // If DOCKER_HOST is not set in the process environment, and it is set in the new environment (which includes settings), the host source is settings
                    actionContext.telemetry.properties.hostSource = 'setting';
                }

                // If DOCKER_HOST is not set in either environment or settings, check docker context
                if (!newEnv.DOCKER_HOST) {
                    ({ DurationMs: actionContext.telemetry.measurements.contextRetrievalTimeMs, Result: { Context: dockerContext } } = await timeUtils.timeIt(async () => dockerContextManager.getCurrentContext()));

                    if (dockerContext === undefined) { // Undefined context means "there's only the default context"
                        actionContext.telemetry.properties.hostSource = 'default';
                    } else if (/default/i.test(dockerContext.Name)) {
                        actionContext.telemetry.properties.hostSource = 'defaultContext';
                    } else {
                        actionContext.telemetry.properties.hostSource = 'customContext';
                    }

                    const host = dockerContext?.Endpoints?.docker.Host;

                    if (host) {
                        const parsed = new url.URL(host);

                        dockerodeOptions.host = host; // Intentionally the full URL (docker-modem can figure out the protocol and hostname from it)
                        dockerodeOptions.port = parsed.port;
                        // TODO dockerodeOptions.username = parsed.username;
                        actionContext.telemetry.properties.hostProtocol = parsed.protocol;
                    } else {
                        actionContext.telemetry.properties.hostProtocol = os.platform() === 'win32' ? 'npipe:' : 'unix:';
                    }
                } else {
                    const parsed = new url.URL(newEnv.DOCKER_HOST);
                    actionContext.telemetry.properties.hostProtocol = parsed.protocol;
                    actionContext.telemetry.measurements.retrievalTimeMs = 0;
                }

                // If Docker host is an SSH URL, we need to configure / validate SSH_AUTH_SOCK for Dockerode
                if (SSH_URL_REGEX.test(newEnv.DOCKER_HOST || dockerodeOptions.host)) {
                    if (!await validateSshAuthSock(newEnv)) {
                        // Don't wait
                        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
                        ext.ui.showWarningMessage(localize('vscode-docker.utils.dockerode.sshAgent', 'In order to use an SSH DOCKER_HOST, you must configure an ssh-agent.'), { learnMoreLink: 'https://aka.ms/AA7assy' });
                    }
                }

                try {
                    ext.dockerodeInitError = undefined;
                    process.env = newEnv;
                    ext.dockerode = new Dockerode(dockerodeOptions);
                } finally {
                    process.env = oldEnv;
                }
            } catch (error) {
                // The error will be displayed in the tree
                ext.dockerodeInitError = error;
                actionContext.errorHandling.suppressReportIssue = true;
                actionContext.errorHandling.suppressDisplay = true;
                throw error;
            }
        }
    );
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
