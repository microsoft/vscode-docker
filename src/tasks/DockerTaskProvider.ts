/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, CustomExecution, ProviderResult, Task, TaskProvider } from 'vscode';
import { callWithTelemetryAndErrorHandling, IActionContext, parseError } from 'vscode-azureextensionui';
import { DockerOrchestration } from '../constants';
import { DockerPlatform, getPlatform } from '../debugging/DockerPlatformHelper';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { ExecError } from '../utils/spawnAsync';
import { DockerBuildTask } from './DockerBuildTaskProvider';
import { DockerPseudoterminal } from './DockerPseudoterminal';
import { DockerRunTask } from './DockerRunTaskProvider';
import { dockerTaskEndEventListener } from './DockerTaskEndEventListener';
import { DockerTaskExecutionContext, DockerTaskProviderName, TaskHelper } from './TaskHelper';

export abstract class DockerTaskProvider implements TaskProvider {

    protected constructor(private readonly telemetryName: DockerTaskProviderName, protected readonly helpers: { [key in DockerPlatform]: TaskHelper }) { }

    public provideTasks(token?: CancellationToken): ProviderResult<Task[]> {
        return []; // Intentionally empty, so that resolveTask gets used
    }

    public resolveTask(task: Task, token?: CancellationToken): ProviderResult<Task> {
        return new Task(
            task.definition,
            task.scope,
            task.name,
            task.source,
            new CustomExecution(async () => Promise.resolve(new DockerPseudoterminal(this, task))),
            task.problemMatchers
        );
    }

    public async executeTask(context: DockerTaskExecutionContext, task: DockerBuildTask | DockerRunTask): Promise<number> {
        try {
            await callWithTelemetryAndErrorHandling(`${this.telemetryName}-execute`, async (actionContext: IActionContext) => {
                actionContext.errorHandling.suppressDisplay = true; // Suppress display. VSCode already has a modal popup and we don't want focus taken away from Terminal window.
                actionContext.errorHandling.rethrow = true; // Rethrow to hit the try/catch outside this block.

                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                ext.activityMeasurementService.recordActivity('overallnoedit');

                if (!context.folder) {
                    throw new Error(localize('vscode-docker.tasks.provider.noScope', 'Unable to determine task scope to execute {0} task \'{1}\'. Please open a workspace folder.', this.telemetryName, task.name));
                }

                context.actionContext = actionContext;
                context.platform = getPlatform(task.definition);

                context.actionContext.telemetry.properties.dockerPlatform = context.platform;
                context.actionContext.telemetry.properties.orchestration = 'single' as DockerOrchestration; // TODO: docker-compose, when support is added
                await this.executeTaskInternal(context, task);

                dockerTaskEndEventListener.fire({ name: task.name, success: true });
            });
        } catch (err) {
            // Errors will not be rethrown, rather it will simply return an error code or 1
            const error = parseError(err);

            if (!(err as ExecError)?.stdErrHandled) {
                context.terminal.writeErrorLine(error.message);
            }

            dockerTaskEndEventListener.fire({ name: task.name, success: false, error: error.message });

            return parseInt(error.errorType, 10) || 1;
        }

        return 0;
    }

    protected abstract async executeTaskInternal(context: DockerTaskExecutionContext, task: Task): Promise<void>;

    protected getHelper(platform: DockerPlatform): TaskHelper {
        return this.helpers[platform];
    }
}
