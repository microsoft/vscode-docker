/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable unicorn/filename-case */

import { IActionContext, parseError } from "vscode-azureextensionui";
import { localize } from '../localize';

export async function callDockerodeWithErrorHandling<T>(dockerodeCallback: () => Promise<T>, context: IActionContext): Promise<T> {
    try {
        return await dockerodeCallback();
    } catch (err) {
        context.errorHandling.suppressReportIssue = true;

        const error = parseError(err);

        if (error && error.errorType === 'ENOENT') {
            throw new Error(localize('vscode-docker.utils.dockerode.failedToConnect', 'Failed to connect. Is Docker installed and running? Error: {0}', error.message));
        }

        throw err;
    }
}
