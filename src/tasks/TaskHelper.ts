/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, ExtensionContext, Task, TaskDefinition, tasks, workspace, WorkspaceFolder } from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { DockerDebugConfiguration } from '../debugging/DockerDebugConfigurationProvider';
import { DockerPlatform } from '../debugging/DockerPlatformHelper';
import { DockerBuildOptions } from './DockerBuildTaskDefinitionBase';
import { DockerBuildTaskDefinition, DockerBuildTaskProvider } from './DockerBuildTaskProvider';
import { DockerRunOptions } from './DockerRunTaskDefinitionBase';
import { DockerRunTaskDefinition, DockerRunTaskProvider } from './DockerRunTaskProvider';
import netCoreTaskHelper from './netcore/NetCoreTaskHelper';
import nodeTaskHelper from './node/NodeTaskHelper';

export interface DockerTaskContext {
    folder: WorkspaceFolder;
    platform: DockerPlatform;
    actionContext: IActionContext;
    cancellationToken?: CancellationToken;
}

// tslint:disable-next-line: no-empty-interface
export interface DockerTaskScaffoldContext extends DockerTaskContext {
}

// tslint:disable-next-line: no-empty-interface
export interface DockerBuildTaskContext extends DockerTaskContext {
}

export interface DockerRunTaskContext extends DockerTaskContext {
    buildDefinition?: DockerBuildTaskDefinition;
}

export interface TaskHelper {
    resolveDockerBuildOptions(context: DockerBuildTaskContext, buildDefinition: DockerBuildTaskDefinition): Promise<DockerBuildOptions>;
    resolveDockerRunOptions(context: DockerRunTaskContext, runDefinition: DockerRunTaskDefinition): Promise<DockerRunOptions>;
}

export function registerTaskProviders(ctx: ExtensionContext): void {
    const helpers = {
        netCore: netCoreTaskHelper,
        node: nodeTaskHelper
    };

    ctx.subscriptions.push(
        tasks.registerTaskProvider(
            'docker-build',
            new DockerBuildTaskProvider(helpers)
        )
    );

    ctx.subscriptions.push(
        tasks.registerTaskProvider(
            'docker-run',
            new DockerRunTaskProvider(helpers)
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

export async function getOfficialBuildTaskForDockerfile(dockerfile: string, folder: WorkspaceFolder): Promise<Task | undefined> {
    let buildTasks = await tasks.fetchTasks({ type: 'docker-build' });
    buildTasks =
        buildTasks.filter(t => t.execution.args.some(a => { // Find all build tasks where an argument to 'docker build' is this Dockerfile
            let arg: string;
            if (typeof a === 'string') {
                arg = a;
            } else {
                arg = a.value;
            }

            arg = resolveWorkspaceFolderPath(folder, arg);
            return arg.toLowerCase() === dockerfile.toLowerCase();
        }));

    if (buildTasks.length === 1) {
        return buildTasks[0]; // If there's only one build task, take it
    } else if (buildTasks.length > 1) {
        return buildTasks.find(t => t.name === 'docker-build: release') || buildTasks[0]; // If there's multiple try finding one with the name 'docker-build: release', else take first
    }

    return undefined;
}

export function resolveWorkspaceFolderPath(folder: WorkspaceFolder, folderPath: string): string {
    return folderPath.replace(/\$\{workspaceFolder\}/gi, folder.uri.fsPath);
}

export function unresolveWorkspaceFolderPath(folder: WorkspaceFolder, folderPath: string): string {
    // tslint:disable-next-line: no-invalid-template-strings
    return folderPath.replace(folder.uri.fsPath, '${workspaceFolder}').replace(/\\/g, '/');
}

// tslint:disable-next-line: no-any
async function recursiveFindTaskByType(allTasks: TaskDefinition[], type: string, node: any): Promise<TaskDefinition | undefined> {
    if (!node) {
        return undefined;
    }

    // tslint:disable: no-unsafe-any
    if (node.preLaunchTask) { // node is a debug configuration
        const next = await findTaskByLabel(allTasks, node.preLaunchTask);
        return await recursiveFindTaskByType(allTasks, type, next);
    } else if (node.type === type) { // node is the task we want
        return node;
    } else if (node.dependsOn) { // node is another task
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
