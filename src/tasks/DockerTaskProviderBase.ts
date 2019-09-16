/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, ProviderResult, Task, TaskProvider } from 'vscode';
import { DockerPlatform } from '../debugging/DockerPlatformHelper';
import { DockerTaskContext, DockerTaskExecutionContext, TaskHelper } from './TaskHelper';

export abstract class DockerTaskProviderBase implements TaskProvider {

    constructor(private readonly telemetryName: string, protected readonly helpers: { [key in DockerPlatform]: TaskHelper }) { }

    public provideTasks(token?: CancellationToken): ProviderResult<Task[]> {
        return []; // Intentionally empty, so that resolveTask gets used
    }

    public resolveTask(task: Task, token?: CancellationToken): ProviderResult<Task> {

    }

    public executeTask(context: DockerTaskExecutionContext, task: Task): Promise<void> {

    }

    protected abstract async resolveTaskInternal(context: DockerTaskContext, task: Task): Promise<Task>;

    protected abstract async executeTaskInternal(context: DockerTaskExecutionContext, task: Task): Promise<void>;
}
