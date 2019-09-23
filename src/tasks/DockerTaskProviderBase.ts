/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, CustomExecution2, ProviderResult, Task, Task2, TaskProvider } from 'vscode';
import { callWithTelemetryAndErrorHandling, IActionContext, parseError } from 'vscode-azureextensionui';
import { DockerPlatform, getPlatform } from '../debugging/DockerPlatformHelper';
import { DockerBuildTask } from './DockerBuildTaskProvider';
import { DockerPseudoShell } from './DockerPseudoShell';
import { DockerRunTask } from './DockerRunTaskProvider';
import { DockerTaskExecutionContext, DockerTaskProviderName, TaskHelper } from './TaskHelper';

export abstract class DockerTaskProviderBase implements TaskProvider {

    protected constructor(private readonly telemetryName: DockerTaskProviderName, protected readonly helpers: { [key in DockerPlatform]: TaskHelper }) { }

    public provideTasks(token?: CancellationToken): ProviderResult<Task[]> {
        return []; // Intentionally empty, so that resolveTask gets used
    }

    public resolveTask(task: Task, token?: CancellationToken): ProviderResult<Task> {
        return new Task2(
            task.definition,
            task.scope,
            task.name,
            task.source,
            new CustomExecution2(() => Promise.resolve(new DockerPseudoShell(this, task))),
            task.problemMatchers
        );
    }

    public async executeTask(context: DockerTaskExecutionContext, task: DockerBuildTask | DockerRunTask): Promise<number> {
        try {
            await callWithTelemetryAndErrorHandling(this.telemetryName, async (actionContext: IActionContext) => {
                actionContext.errorHandling.rethrow = true; // Rethrow to hit the try/catch outside this block

                if (!context.folder) {
                    throw new Error(`Unable to determine task scope to execute ${this.telemetryName} task '${task.name}'.`);
                }

                context.actionContext = actionContext;
                context.platform = getPlatform(task.definition);

                context.actionContext.telemetry.properties.platform = context.platform;
                return await this.executeTaskInternal(context, task);
            });
        } catch (err) {
            const error = parseError(err);
            return parseInt(error.errorType, 10) || 1;
        }

        return 0;
    }

    protected abstract async executeTaskInternal(context: DockerTaskExecutionContext, task: Task): Promise<void>;

    protected getHelper(platform: DockerPlatform): TaskHelper {
        const helper = this.helpers[platform];

        if (!helper) {
            throw new Error(`The platform '${platform}' is not currently supported for ${this.telemetryName} tasks.`);
        }

        return helper;
    }
}
