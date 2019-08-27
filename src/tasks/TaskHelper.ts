/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, ExtensionContext, Task, tasks, workspace, WorkspaceFolder } from 'vscode';
import { DockerDebugConfiguration } from '../debugging/DockerDebugConfigurationProvider';
import { DockerBuildOptions, DockerBuildTask, DockerBuildTaskProvider } from './DockerBuildTaskProvider';
import { DockerRunOptions, DockerRunTask, DockerRunTaskProvider } from './DockerRunTaskProvider';
import { NetCoreTaskHelper } from './netcore/NetCoreTaskHelper';
import { NodeTaskHelper } from './node/NodeTaskHelper';

export type TaskPlatform = 'netCore' | 'node' | 'unknown';

export interface TaskHelper<THelperBuildOptions, THelperRunOptions> {
    provideDockerBuildTasks(folder: WorkspaceFolder): Promise<DockerBuildTask[]>;
    provideDockerRunTasks(folder: WorkspaceFolder): Promise<DockerRunTask[]>;
    resolveDockerBuildOptions(folder: WorkspaceFolder, buildOptions: DockerBuildOptions, helperOptions: THelperBuildOptions | undefined, token?: CancellationToken): Promise<DockerBuildOptions>;
    resolveDockerRunOptions(folder: WorkspaceFolder, runOptions: DockerRunOptions, helperOptions: THelperRunOptions | undefined, token?: CancellationToken): Promise<DockerRunOptions>;
}

export function registerTaskProviders(ctx: ExtensionContext): void {
    const netCoreTaskHelper = new NetCoreTaskHelper();
    const nodeTaskHelper = new NodeTaskHelper();

    ctx.subscriptions.push(
        tasks.registerTaskProvider(
            'docker-build',
            new DockerBuildTaskProvider(
                netCoreTaskHelper,
                nodeTaskHelper
            )
        )
    );

    ctx.subscriptions.push(
        tasks.registerTaskProvider(
            'docker-run',
            new DockerRunTaskProvider(
                netCoreTaskHelper,
                nodeTaskHelper
            )
        )
    );
}

export async function addTask(task: Task): Promise<void> {
    const workspaceTasks = workspace.getConfiguration('tasks');

    (workspaceTasks.tasks as object[]).push(task);

    workspaceTasks.update('tasks', workspaceTasks.tasks);
}

export async function getAssociatedDockerRunTask(debugConfiguration: DockerDebugConfiguration): Promise<object | undefined> {
    // Using config API instead of tasks API means no wasted perf on re-resolving the tasks, and avoids confusion on resolved type !== true type
    const tasksConfig = workspace.getConfiguration('tasks');
    const allTasks: ITask[] = tasksConfig && tasksConfig.tasks as ITask[] || [];
    return await recursiveFindTaskByType(allTasks, 'docker-run', debugConfiguration);
}

export async function getAssociatedDockerBuildTask(runTask: DockerRunTask): Promise<object | undefined> {
    // Using config API instead of tasks API means no wasted perf on re-resolving the tasks, and avoids confusion on resolved type !== true type
    const tasksConfig = workspace.getConfiguration('tasks');
    const allTasks: ITask[] = tasksConfig && tasksConfig.tasks as ITask[] || [];
    return await recursiveFindTaskByType(allTasks, 'docker-build', runTask);
}

interface IDependsOn {
    type?: string;
}

interface ITask {
    label?: string,
    type?: string,
    dependsOn?: string[] | IDependsOn
}

// tslint:disable-next-line: no-any
async function recursiveFindTaskByType(allTasks: ITask[], type: string, node: any): Promise<object | undefined> {
    if (!node) {
        return undefined;
    }

    // tslint:disable: no-unsafe-any
    if (node.preLaunchTask) { // Node is a debug configuration
        const next = await findTaskByLabel(allTasks, node.preLaunchTask);
        return await recursiveFindTaskByType(allTasks, type, next);
    } else if (node.type === type) { // Node is the task we want
        return node;
    } else if (node.dependsOn) { // Node is another task
        if (Array.isArray(node.dependsOn)) {
            for (const label of node.dependsOn as string[]) {
                let next = await findTaskByLabel(allTasks, label);
                next = await recursiveFindTaskByType(allTasks, type, next);

                if (next) {
                    return next;
                }
            }

            return undefined;
        } else {
            const nextType = node.dependsOn.type;
            const next = await findTaskByType(allTasks, nextType);
            return await recursiveFindTaskByType(allTasks, type, next);
        }
    }
    // tslint:enable: no-unsafe-any

    return undefined;
}

async function findTaskByLabel(allTasks: ITask[], label: string): Promise<object | undefined> {
    return allTasks.find(t => t.label === label);
}

async function findTaskByType(allTasks: ITask[], type: string): Promise<object | undefined> {
    return allTasks.find(t => t.type === type);
}

// tslint:disable-next-line: no-unnecessary-class
export class TaskCache {
    private static readonly cache: { [key: string]: object | undefined } = {};

    public static set(identifier: string, value: object): object {
        return this.cache[identifier] = value;
    }

    public static update(identifier: string, value: object): object {
        const result: object = {};
        this.cache[identifier] = this.cache[identifier] || {};
        const keys = [...Object.keys(this.cache[identifier]), ...Object.keys(value)];

        for (const key of keys) {
            result[key] = value[key] !== undefined ? value[key] : this.cache[identifier][key];
        }

        return this.cache[identifier] = result;
    }

    public static unset(identifier: string): void {
        this.cache[identifier] = undefined;
    }

    public static get(identifier: string): object | undefined {
        return this.cache[identifier];
    }
}
