/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import { CancellationToken, ProviderResult, ShellExecution, Task, TaskProvider, TaskScope } from "vscode";
import { ext } from '../../extensionVariables';
import { NetSdkTaskHelper, netSdkTaskName } from './NetSdkTaskHelper';

export class NetSdkBuildTaskProvider implements TaskProvider {

    public constructor(protected readonly helper: NetSdkTaskHelper) { }

    provideTasks(token: CancellationToken): ProviderResult<Task[]> {

        return callWithTelemetryAndErrorHandling(`${netSdkTaskName}-execute`, async (actionContext: IActionContext) => {
            actionContext.errorHandling.suppressDisplay = true; // Suppress display. VSCode already has a modal popup and we don't want focus taken away from Terminal window.
            actionContext.errorHandling.rethrow = true; // Rethrow to hit the try/catch outside this block.

            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            ext.activityMeasurementService.recordActivity('overallnoedit');

            const netSdkBuildCommandPromise = this.helper.getNetSdkBuildCommand(actionContext);
            return await netSdkBuildCommandPromise.then(netSdkBuildCommand => {
                return [
                    new Task(
                        { type: netSdkTaskName },
                        TaskScope.Workspace,
                        'debug',
                        netSdkTaskName,
                        new ShellExecution(netSdkBuildCommand),
                    )
                ];
            });
        });

    }

    resolveTask(task: Task, token: CancellationToken): ProviderResult<Task> {
        return task; // we can just return the task as-is
    }
}
