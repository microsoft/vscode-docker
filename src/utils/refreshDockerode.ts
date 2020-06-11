/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import Dockerode = require('dockerode');
import { Socket } from 'net';
import * as os from 'os';
import * as url from 'url';
import { CancellationTokenSource, workspace } from 'vscode';
import { callWithTelemetryAndErrorHandling, IActionContext } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { addDockerSettingsToEnv } from './addDockerSettingsToEnv';
import { cloneObject } from './cloneObject';
import { dockerContextManager, IDockerContext } from './dockerContextManager';
import { isWindows } from './osUtils';
import { delay } from './promiseUtils';
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
                // docker-context.initialize and docker-context.change should be treated as "activation events", in that they aren't real user action
                actionContext.telemetry.properties.isActivationEvent = 'true';

                // If the docker.dockerodeOptions setting is present, use it only
                const config = workspace.getConfiguration('docker');
                const overrideDockerodeOptions = config.get('dockerodeOptions');
                // eslint-disable-next-line @typescript-eslint/tslint/config
                if (overrideDockerodeOptions && Object.keys(overrideDockerodeOptions).length > 0) {
                    actionContext.telemetry.properties.hostSource = 'docker.dockerodeOptions';
                    actionContext.telemetry.measurements.retrievalTimeMs = 0;
                    ext.dockerodeInitError = undefined;
                    ext.dockerode = new Dockerode(<Dockerode.DockerOptions>overrideDockerodeOptions);
                    return;
                }

                // Set up environment variables
                const oldEnv = process.env;
                const newEnv: NodeJS.ProcessEnv = cloneObject(process.env); // make a clone before we change anything

                // If DOCKER_HOST is set in the process environment, the host source is environment
                if (oldEnv.DOCKER_HOST) {
                    actionContext.telemetry.properties.hostSource = 'env';
                }

                // Override with VSCode settings
                addDockerSettingsToEnv(newEnv, oldEnv);

                // If the old value is different from the new value, then the setting overrode it
                if ((oldEnv.DOCKER_HOST ?? '') !== (newEnv.DOCKER_HOST ?? '')) {
                    actionContext.telemetry.properties.hostSource = 'docker.host';
                }

                // Only use Docker Context if DOCKER_HOST is not defined (same behavior as CLI)
                if (!newEnv.DOCKER_HOST) {
                    await addDockerContextHostToEnv(actionContext, newEnv);
                } else {
                    actionContext.telemetry.measurements.retrievalTimeMs = 0;
                }

                if (newEnv.DOCKER_HOST) {
                    const parsed = new url.URL(newEnv.DOCKER_HOST);
                    actionContext.telemetry.properties.hostProtocol = parsed.protocol;
                } else {
                    actionContext.telemetry.properties.hostProtocol = os.platform() === 'win32' ? 'npipe:' : 'unix:';
                }

                // If host is an SSH URL, we need to configure / validate SSH_AUTH_SOCK for Dockerode
                if (newEnv.DOCKER_HOST && SSH_URL_REGEX.test(newEnv.DOCKER_HOST)) {
                    if (!await validateSshAuthSock(newEnv)) {
                        // Don't wait
                        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
                        ext.ui.showWarningMessage(localize('vscode-docker.utils.dockerode.sshAgent', 'In order to use an SSH DOCKER_HOST, you must configure an ssh-agent.'), { learnMoreLink: 'https://aka.ms/AA7assy' });
                    }
                }

                try {
                    ext.dockerodeInitError = undefined;
                    process.env = newEnv;
                    ext.dockerode = new Dockerode();
                } finally {
                    process.env = oldEnv;
                }
            } catch (error) {
                // The error will be displayed in the tree
                ext.dockerodeInitError = error;
                actionContext.errorHandling.suppressReportIssue = true;
                actionContext.errorHandling.suppressDisplay = true;

                // Rethrow it so the telemetry handler can deal with it
                throw error;
            }
        }
    );
}

async function addDockerContextHostToEnv(actionContext: IActionContext, newEnv: NodeJS.ProcessEnv): Promise<void> {
    let dockerContext: IDockerContext;
    ({ DurationMs: actionContext.telemetry.measurements.contextRetrievalTimeMs, Result: { Context: dockerContext } } = await timeUtils.timeIt(async () => dockerContextManager.getCurrentContext()));

    if (dockerContext === undefined) { // Undefined context means there's only the default context
        actionContext.telemetry.properties.hostSource = 'defaultContextOnly';
    } else if (/^default$/i.test(dockerContext.Name)) {
        actionContext.telemetry.properties.hostSource = 'defaultContextSelected';
    } else {
        actionContext.telemetry.properties.hostSource = 'customContextSelected';
    }

    newEnv.DOCKER_HOST = dockerContext?.Endpoints?.docker?.Host;

    if (dockerContext?.Endpoints?.docker?.SkipTLSVerify) {
        // Disabling TLS specifically requires the value to be an empty string
        // https://docs.docker.com/compose/reference/envvars/#docker_tls_verify
        newEnv.DOCKER_TLS_VERIFY = '';
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
