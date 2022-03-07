/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import { IActionContext, UserCancelledError } from '@microsoft/vscode-azext-utils';
import { CancellationToken, ConfigurationTarget, ExtensionContext, QuickPickItem, Task, WorkspaceFolder, tasks, workspace } from 'vscode';
import { DebugConfigurationBase } from '../debugging/DockerDebugConfigurationBase';
import { DockerDebugConfiguration } from '../debugging/DockerDebugConfigurationProvider';
import { DockerPlatform } from '../debugging/DockerPlatformHelper';
import { localize } from '../localize';
import { getValidImageName, getValidImageNameWithTag } from '../utils/getValidImageName';
import { pathNormalize } from '../utils/pathNormalize';
import { resolveVariables } from '../utils/resolveVariables';
import { DockerBuildOptions } from './DockerBuildTaskDefinitionBase';
import { DockerBuildTask, DockerBuildTaskDefinition, DockerBuildTaskProvider } from './DockerBuildTaskProvider';
import { DockerComposeTaskProvider } from './DockerComposeTaskProvider';
import { DockerPseudoterminal } from './DockerPseudoterminal';
import { DockerContainerVolume, DockerRunOptions, DockerRunTaskDefinitionBase } from './DockerRunTaskDefinitionBase';
import { DockerRunTask, DockerRunTaskDefinition, DockerRunTaskProvider } from './DockerRunTaskProvider';
import { netCoreTaskHelper } from './netcore/NetCoreTaskHelper';
import { nodeTaskHelper } from './node/NodeTaskHelper';
import { pythonTaskHelper } from './python/PythonTaskHelper';
import { TaskDefinitionBase } from './TaskDefinitionBase';

export type DockerTaskProviderName = 'docker-build' | 'docker-run' | 'docker-compose';

export interface DockerTaskContext {
    folder: WorkspaceFolder;
    platform?: DockerPlatform;
    actionContext?: IActionContext;
    cancellationToken?: CancellationToken;
}

export function throwIfCancellationRequested(context: DockerTaskContext): void {
    if (context &&
        context.cancellationToken &&
        context.cancellationToken.isCancellationRequested) {
        throw new UserCancelledError();
    }
}

export interface DockerTaskScaffoldContext extends DockerTaskContext {
    dockerfile: string;
    ports?: number[];
}

export interface DockerTaskExecutionContext extends DockerTaskContext {
    terminal: DockerPseudoterminal;
}

export interface DockerBuildTaskContext extends DockerTaskExecutionContext {
    imageName?: string;
    buildTaskResult?: string;
}

export interface DockerRunTaskContext extends DockerTaskExecutionContext {
    containerId?: string;
    buildDefinition?: DockerBuildTaskDefinition;
}

// This doesn't need to be extended so redefining for parity is simplest
export type DockerComposeTaskContext = DockerTaskExecutionContext;

export interface TaskHelper {
    preBuild?(context: DockerBuildTaskContext, buildDefinition: DockerBuildTaskDefinition): Promise<void>;
    getDockerBuildOptions(context: DockerBuildTaskContext, buildDefinition: DockerBuildTaskDefinition): Promise<DockerBuildOptions>;
    postBuild?(context: DockerBuildTaskContext, buildDefinition: DockerBuildTaskDefinition): Promise<void>;

    preRun?(context: DockerRunTaskContext, runDefinition: DockerRunTaskDefinition): Promise<void>;
    getDockerRunOptions(context: DockerRunTaskContext, runDefinition: DockerRunTaskDefinition): Promise<DockerRunOptions>;
    postRun?(context: DockerRunTaskContext, runDefinition: DockerRunTaskDefinition): Promise<void>;
}

export function registerTaskProviders(ctx: ExtensionContext): void {
    const helpers = {
        netCore: netCoreTaskHelper,
        node: nodeTaskHelper,
        python: pythonTaskHelper
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

    ctx.subscriptions.push(
        tasks.registerTaskProvider(
            'docker-compose',
            new DockerComposeTaskProvider()
        )
    );
}

export function hasTask(taskLabel: string, folder: WorkspaceFolder): boolean {
    const workspaceTasks = workspace.getConfiguration('tasks', folder.uri);
    const allTasks = workspaceTasks && workspaceTasks.tasks as TaskDefinitionBase[] || [];
    return allTasks.findIndex(t => t.label === taskLabel) > -1;
}

export async function addTask(newTask: DockerBuildTaskDefinition | DockerRunTaskDefinition, folder: WorkspaceFolder, overwrite?: boolean): Promise<boolean> {
    // Using config API instead of tasks API means no wasted perf on re-resolving the tasks, and avoids confusion on resolved type !== true type
    const workspaceTasks = workspace.getConfiguration('tasks', folder.uri);
    const allTasks = workspaceTasks && workspaceTasks.tasks as TaskDefinitionBase[] || [];

    const existingTaskIndex = allTasks.findIndex(t => t.label === newTask.label);
    if (existingTaskIndex >= 0) {
        // If a task of the same label exists already
        if (overwrite) {
            // If overwriting, do so
            allTasks[existingTaskIndex] = newTask;
        } else {
            // If not overwriting, return false
            return false;
        }
    } else {
        allTasks.push(newTask);
    }

    await workspaceTasks.update('tasks', allTasks, ConfigurationTarget.WorkspaceFolder);
    return true;
}

export async function getAssociatedDockerRunTask(debugConfiguration: DockerDebugConfiguration): Promise<DockerRunTaskDefinition | undefined> {
    // Using config API instead of tasks API means no wasted perf on re-resolving the tasks (not just our tasks), and avoids confusion on resolved type !== true type
    const workspaceTasks = workspace.getConfiguration('tasks');
    const allTasks: TaskDefinitionBase[] = workspaceTasks && workspaceTasks.tasks as TaskDefinitionBase[] || [];

    return await recursiveFindTaskByType(allTasks, 'docker-run', debugConfiguration) as DockerRunTaskDefinition;
}

export async function getAssociatedDockerBuildTask(runTask: DockerRunTask): Promise<DockerBuildTaskDefinition | undefined> {
    // Using config API instead of tasks API means no wasted perf on re-resolving the tasks (not just our tasks), and avoids confusion on resolved type !== true type
    const workspaceTasks = workspace.getConfiguration('tasks');
    const allTasks: TaskDefinitionBase[] = workspaceTasks && workspaceTasks.tasks as TaskDefinitionBase[] || [];

    // Due to inconsistencies in the Task API, runTask does not have its dependsOn, so we need to re-find it by label
    // Due to more inconsistencies in the Task API, DockerRunTask.name is equal to the Tasks.json 'label'
    const runTaskDefinition: DockerRunTaskDefinitionBase = await findTaskByLabel(allTasks, runTask.name);

    return await recursiveFindTaskByType(allTasks, 'docker-build', runTaskDefinition) as DockerBuildTaskDefinition;
}

export async function getOfficialBuildTaskForDockerfile(context: IActionContext, dockerfile: string, folder: WorkspaceFolder): Promise<Task | undefined> {
    const resolvedDockerfile = pathNormalize(resolveVariables(dockerfile, folder));

    let buildTasks: DockerBuildTask[] = await tasks.fetchTasks({ type: 'docker-build' }) || [];
    buildTasks =
        buildTasks.filter(buildTask => {
            const taskDockerfile = pathNormalize(resolveVariables(buildTask.definition?.dockerBuild?.dockerfile ?? 'Dockerfile', folder));
            const taskContext = pathNormalize(resolveVariables(buildTask.definition?.dockerBuild?.context ?? '', folder));

            if (taskDockerfile && taskContext) {
                const taskDockerfileAbsPath = path.resolve(taskContext, taskDockerfile);
                return taskDockerfileAbsPath === resolvedDockerfile && buildTask.scope === folder;
            }

            return false;
        });

    if (buildTasks.length === 1) {
        return buildTasks[0]; // If there's only one build task, take it
    } else if (buildTasks.length > 1) {
        const releaseTask = buildTasks.find(t => t.name === 'docker-build: release');

        if (releaseTask) {
            return releaseTask;
        }

        const items: QuickPickItem[] = buildTasks.map(t => {
            return { label: t.name };
        });

        const item = await context.ui.showQuickPick(items, { placeHolder: localize('vscode-docker.tasks.helper.chooseBuildDefinition', 'Choose the Docker Build definition.') });
        return buildTasks.find(t => t.name === item.label);
    }

    return undefined;
}

export function inferImageName(runOptions: DockerRunTaskDefinition, context: DockerRunTaskContext, defaultNameHint: string, defaultTag?: 'dev' | 'latest'): string {
    return (runOptions && runOptions.dockerRun && runOptions.dockerRun.image)
        || (context && context.buildDefinition && context.buildDefinition.dockerBuild && context.buildDefinition.dockerBuild.tag)
        || getDefaultImageName(defaultNameHint, defaultTag);
}

export function getDefaultImageName(nameHint: string, tag?: 'dev' | 'latest'): string {
    tag = tag || 'latest';
    return getValidImageNameWithTag(nameHint, tag);
}

export function getDefaultContainerName(nameHint: string, tag?: 'dev' | 'latest'): string {
    tag = tag || 'dev';
    return `${getValidImageName(nameHint)}-${tag}`;
}

export async function recursiveFindTaskByType(allTasks: TaskDefinitionBase[], type: string, node: DebugConfigurationBase | TaskDefinitionBase): Promise<TaskDefinitionBase | undefined> {
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

export function addVolumeWithoutConflicts(volumes: DockerContainerVolume[], volume: DockerContainerVolume): boolean {
    if (volumes.find(v => v.containerPath === volume.containerPath)) {
        return false;
    }

    volumes.push(volume);
    return true;
}

async function findTaskByLabel(allTasks: TaskDefinitionBase[], label: string): Promise<TaskDefinitionBase | undefined> {
    return allTasks.find(t => t.label === label);
}

async function findTaskByType(allTasks: TaskDefinitionBase[], type: string): Promise<TaskDefinitionBase | undefined> {
    return allTasks.find(t => t.type === type);
}
