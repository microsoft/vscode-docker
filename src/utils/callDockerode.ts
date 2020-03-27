/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable unicorn/filename-case */

import { IActionContext, parseError } from "vscode-azureextensionui";
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { dockerContextManager } from './dockerContextManager';
import { refreshDockerode } from './refreshDockerode';

export async function callDockerode<T>(dockerodeCallback: () => T): Promise<T> {
    const p = new Promise<T>((resolve, reject) => {
        try {
            const result: T = dockerodeCallback();
            resolve(result);
        } catch (err) {
            reject(err);
        }
    });

    return callDockerodeAsync(async () => p);
}

export async function callDockerodeAsync<T>(dockerodeAsyncCallback: () => Promise<T>): Promise<T> {
    // If running tests, don't refresh Dockerode (some tests override Dockerode)
    if (!ext.runningTests) {
        const { Changed: contextChanged } = await dockerContextManager.getCurrentContext();
        if (contextChanged) {
            await refreshDockerode();
        }
    }

    return await dockerodeAsyncCallback();
}

export async function callDockerodeWithErrorHandling<T>(dockerodeCallback: () => Promise<T>, context: IActionContext): Promise<T> {
    try {
        return await callDockerodeAsync(dockerodeCallback);
    } catch (err) {
        context.errorHandling.suppressReportIssue = true;

        const error = parseError(err);

        if (error?.errorType === 'ENOENT') {
            throw new Error(localize('vscode-docker.utils.dockerode.failedToConnect', 'Failed to connect. Is Docker installed and running? Error: {0}', error.message));
        }

        throw err;
    }
}
