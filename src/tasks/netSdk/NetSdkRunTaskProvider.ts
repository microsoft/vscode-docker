/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, CustomExecution, ProviderResult, Task, TaskDefinition, TaskScope } from "vscode";
import { DockerPseudoterminal } from "../DockerPseudoterminal";
import { DockerTaskProvider } from '../DockerTaskProvider';
import { DockerTaskExecutionContext } from '../TaskHelper';
import { NetSdkTaskHelper, netSdkRunTaskSymbol } from './NetSdkTaskHelper';

export class NetSdkRunTaskProvider extends DockerTaskProvider {

    public constructor(protected readonly helper: NetSdkTaskHelper) { super(netSdkRunTaskSymbol, undefined); }

    provideTasks(token: CancellationToken): ProviderResult<Task[]> {
        // provide the bare minimum: a task that will show up in the command palette
        const problemMatchers = ["$myProblemMatcher"];

        const task = new Task(
            { type: netSdkRunTaskSymbol },
            TaskScope.Workspace,
            'sdk-debug',
            netSdkRunTaskSymbol,
            problemMatchers
        );

        return [
            new Task(
                { type: netSdkRunTaskSymbol },
                TaskScope.Workspace,
                'sdk-debug',
                netSdkRunTaskSymbol,
                new CustomExecution(async (resolvedDefinition: TaskDefinition) => Promise.resolve(new DockerPseudoterminal(this, task, resolvedDefinition))),
                problemMatchers
            )
        ];
    }

    protected async executeTaskInternal(context: DockerTaskExecutionContext, task: Task): Promise<void> {

        const buildCommand = await this.helper.getNetSdkBuildCommand(context.actionContext);
        await context.terminal.execAsyncInTerminal(
            buildCommand,
            {
                folder: context.folder,
                token: context.cancellationToken,
            }
        );

        const runCommand = await this.helper.getNetSdkRunCommand(context.actionContext);
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
