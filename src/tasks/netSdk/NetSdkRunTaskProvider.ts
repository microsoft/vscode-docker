/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, CustomExecution, ProviderResult, Task, TaskDefinition, TaskScope } from "vscode";
import { DockerPseudoterminal } from "../DockerPseudoterminal";
import { DockerTaskProvider } from '../DockerTaskProvider';
import { DockerTaskExecutionContext } from '../TaskHelper';
import { NET_SDK_RUN_TASK_SYMBOL, NetSdkTaskHelper } from './NetSdkTaskHelper';

const netSdkDebugTaskName = 'debug';
export class NetSdkRunTaskProvider extends DockerTaskProvider {

    public constructor(protected readonly helper: NetSdkTaskHelper) { super(NET_SDK_RUN_TASK_SYMBOL, undefined); }

    provideTasks(token: CancellationToken): ProviderResult<Task[]> {

        // we need to initialize a task first so we can pass it into `DockerPseudoterminal`
        const task = new Task(
            { type: NET_SDK_RUN_TASK_SYMBOL },
            TaskScope.Workspace,
            netSdkDebugTaskName,
            NET_SDK_RUN_TASK_SYMBOL
        );

        return [
            new Task(
                { type: NET_SDK_RUN_TASK_SYMBOL },
                TaskScope.Workspace,
                netSdkDebugTaskName,
                NET_SDK_RUN_TASK_SYMBOL,
                new CustomExecution(
                    async (resolvedDefinition: TaskDefinition) => Promise.resolve(new DockerPseudoterminal(this, task, resolvedDefinition))
                ),
            )
        ];
    }

    protected async executeTaskInternal(context: DockerTaskExecutionContext, task: Task): Promise<void> {

        // use dotnet to build the image
        const buildCommand = await this.helper.getNetSdkBuildCommand(context);
        await context.terminal.execAsyncInTerminal(
            buildCommand,
            {
                folder: context.folder,
                token: context.cancellationToken,
            }
        );

        // use docker run to run the image
        const runCommand = await this.helper.getNetSdkRunCommand(context);
        await context.terminal.execAsyncInTerminal(
            runCommand,
            {
                folder: context.folder,
                token: context.cancellationToken,
            }
        );

        return Promise.resolve();
    }
}
