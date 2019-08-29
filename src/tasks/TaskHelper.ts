/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, ExtensionContext, TaskDefinition, tasks, workspace, WorkspaceFolder } from 'vscode';
import { DockerDebugConfiguration } from '../debugging/DockerDebugConfigurationProvider';
import { ext } from '../extensionVariables';
import { DockerBuildOptions } from './DockerBuildTaskDefinitionBase';
import { DockerBuildTaskDefinition, DockerBuildTaskProvider } from './DockerBuildTaskProvider';
import { DockerRunOptions } from './DockerRunTaskDefinitionBase';
import { DockerRunTaskDefinition, DockerRunTaskProvider } from './DockerRunTaskProvider';
import { NetCoreTaskHelper } from './netcore/NetCoreTaskHelper';
import { NodeTaskHelper } from './node/NodeTaskHelper';

export interface TaskHelper {
    provideDockerBuildTasks(folder: WorkspaceFolder): Promise<DockerBuildTaskDefinition[]>;
    provideDockerRunTasks(folder: WorkspaceFolder): Promise<DockerRunTaskDefinition[]>;
    resolveDockerBuildOptions(folder: WorkspaceFolder, buildDefinition: DockerBuildTaskDefinition, token?: CancellationToken): Promise<DockerBuildOptions>;
    resolveDockerRunOptions(folder: WorkspaceFolder, buildDefinition: DockerBuildTaskDefinition | undefined, runDefinition: DockerRunTaskDefinition, token?: CancellationToken): Promise<DockerRunOptions>;
}

export function registerTaskProviders(ctx: ExtensionContext): void {
    const netCoreTaskHelper = new NetCoreTaskHelper();
    const nodeTaskHelper = new NodeTaskHelper();

    ctx.subscriptions.push(
        tasks.registerTaskProvider(
            'docker-build',
            ext.buildTaskProvider = new DockerBuildTaskProvider({
                netCore: netCoreTaskHelper,
                node: nodeTaskHelper
            })
        )
    );

    ctx.subscriptions.push(
        tasks.registerTaskProvider(
            'docker-run',
            ext.runTaskProvider = new DockerRunTaskProvider(
                netCoreTaskHelper,
                nodeTaskHelper
            )
        )
    );
}

export async function addTask(task: DockerBuildTaskDefinition | DockerRunTaskDefinition): Promise<boolean> {
    // Using config API instead of tasks API means no wasted perf on re-resolving the tasks, and avoids confusion on resolved type !== true type
    const workspaceTasks = workspace.getConfiguration('tasks');
    const allTasks = workspaceTasks && workspaceTasks.tasks as TaskDefinition[] || [];

    if (allTasks.some(t => t.label === task.label)) {
        return false;
    }

    allTasks.push(task);
    await workspaceTasks.update('tasks', allTasks);
    return true;
}

export async function getAssociatedDockerRunTask(debugConfiguration: DockerDebugConfiguration): Promise<DockerRunTaskDefinition | undefined> {
    // Using config API instead of tasks API means no wasted perf on re-resolving the tasks, and avoids confusion on resolved type !== true type
    const workspaceTasks = workspace.getConfiguration('tasks');
    const allTasks: TaskDefinition[] = workspaceTasks && workspaceTasks.tasks as TaskDefinition[] || [];

    return await recursiveFindTaskByType(allTasks, 'docker-run', debugConfiguration);
}

export async function getAssociatedDockerBuildTask(runTask: DockerRunTaskDefinition): Promise<DockerBuildTaskDefinition | undefined> {
    // Using config API instead of tasks API means no wasted perf on re-resolving the tasks, and avoids confusion on resolved type !== true type
    const workspaceTasks = workspace.getConfiguration('tasks');
    const allTasks: TaskDefinition[] = workspaceTasks && workspaceTasks.tasks as TaskDefinition[] || [];

    return await recursiveFindTaskByType(allTasks, 'docker-build', runTask);
}

// tslint:disable-next-line: no-any
async function recursiveFindTaskByType(allTasks: TaskDefinition[], type: string, node: any): Promise<TaskDefinition | undefined> {
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

async function findTaskByLabel(allTasks: TaskDefinition[], label: string): Promise<TaskDefinition | undefined> {
    return allTasks.find(t => t.label === label);
}

async function findTaskByType(allTasks: TaskDefinition[], type: string): Promise<TaskDefinition | undefined> {
    return allTasks.find(t => t.type === type);
}
