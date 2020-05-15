/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable unicorn/filename-case */

import { IActionContext, parseError, UserCancelledError } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { dockerContextManager } from './dockerContextManager';
import { CancellationPromiseSource, TimeoutPromiseSource } from './promiseUtils';
import { refreshDockerode } from './refreshDockerode';

// 20 s timeout for all calls (enough time for a possible Dockerode refresh + the call, but short enough to be UX-reasonable)
const dockerodeCallTimeout = 20 * 1000;

let cps: CancellationPromiseSource | undefined;

export async function callDockerode<T>(dockerodeCallback: () => T, context?: IActionContext): Promise<T> {
    const p = new Promise<T>((resolve, reject) => {
        try {
            const result: T = dockerodeCallback();
            resolve(result);
        } catch (err) {
            reject(err);
        }
    });

    return callDockerodeAsync(async () => p, context);
}

export async function callDockerodeAsync<T>(dockerodeAsyncCallback: () => Promise<T>, context?: IActionContext): Promise<T> {
    const tps = new TimeoutPromiseSource(dockerodeCallTimeout);
    const evt = tps.onTimeout(() => {
        if (context) {
            context.errorHandling.suppressReportIssue = true;
        }
    });

    try {
        // If running tests, don't refresh Dockerode (some tests override Dockerode)
        if (!ext.runningTests) {
            const { Changed: contextChanged } = await dockerContextManager.getCurrentContext();
            if (contextChanged) {
                /* eslint-disable no-unused-expressions */
                // This will cause any still-awaiting promises to reject with UserCancelledError, and then cps will be recreated
                cps?.cancel();
                cps?.dispose();
                cps = undefined;
                /* eslint-enable no-unused-expressions */

                await refreshDockerode();
            }
        }

        cps = cps ?? new CancellationPromiseSource(UserCancelledError, localize('vscode-docker.utils.dockerode.contextChanged', 'The Docker context has changed.'));
        return await Promise.race([dockerodeAsyncCallback(), cps.promise, tps.promise]);
    } finally {
        evt.dispose();
        tps.dispose();
    }
}

export async function callDockerodeWithErrorHandling<T>(dockerodeCallback: () => Promise<T>, context: IActionContext): Promise<T> {
    try {
        return await callDockerodeAsync(dockerodeCallback, context);
    } catch (err) {
        context.errorHandling.suppressReportIssue = true;

        const error = parseError(err);

        if (error?.errorType === 'ENOENT') {
            throw new Error(localize('vscode-docker.utils.dockerode.failedToConnect', 'Failed to connect. Is Docker installed and running? Error: {0}', error.message));
        }

        throw err;
    }
}
