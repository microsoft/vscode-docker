/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext, UserCancelledError } from '@microsoft/vscode-azext-utils';
import type { Run } from '@azure/arm-containerregistry';
import { scheduleRunRequest, RootStrategy } from './scheduleRunRequest';
import { delay } from '../../../../utils/promiseUtils';
import { getArmContainerRegistry } from '../../../../utils/lazyPackages';

const WAIT_MS = 5000;

export async function buildImageInAzure(context: IActionContext, uri?: vscode.Uri | undefined, rootStrategy?: RootStrategy | undefined): Promise<Run | undefined> {
    if (!vscode.workspace.isTrusted) {
        throw new UserCancelledError('enforceTrust');
    }

    const getRun = await scheduleRunRequest(context, "DockerBuildRequest", uri, rootStrategy);
    
    let run = await getRun();
    const { KnownRunStatus } = await getArmContainerRegistry();
    while (
        run.status === KnownRunStatus.Started ||
        run.status === KnownRunStatus.Queued ||
        run.status === KnownRunStatus.Running
    ) {
        await delay(WAIT_MS);
        run = await getRun();
    }

    // we are returning the run so that other extensions can consume this with the vscode.commands.executeCommand
    // currently it is used by the ms-kubernetes-tools.aks-devx-tools extension (https://github.com/Azure/aks-devx-tools)
    return run;
}

