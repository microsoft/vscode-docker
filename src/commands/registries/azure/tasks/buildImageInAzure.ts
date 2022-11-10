/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext, UserCancelledError } from '@microsoft/vscode-azext-utils';
import { KnownRunStatus, Run } from '@azure/arm-containerregistry';
import { scheduleRunRequest } from './scheduleRunRequest';
import { sleep } from '../../../../utils/sleep';

const WAIT_MS = 500;

export async function buildImageInAzure(context: IActionContext, uri?: vscode.Uri | undefined): Promise<Run> {
    if (!vscode.workspace.isTrusted) {
        throw new UserCancelledError('enforceTrust');
    }

    const getRun = await scheduleRunRequest(context, "DockerBuildRequest", uri);
    let run = await getRun();
    while (run.status === KnownRunStatus.Running) {
        await sleep(WAIT_MS);
        run = await getRun();
    }

    return run;
}

