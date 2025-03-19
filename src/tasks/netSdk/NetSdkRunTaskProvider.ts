/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import { CancellationToken, CustomExecution, Task, TaskDefinition, TaskScope } from "vscode";
import { DockerPseudoterminal } from "../DockerPseudoterminal";
import { DockerRunTask } from "../DockerRunTaskProvider";
import { DockerTaskProvider } from '../DockerTaskProvider';
import { DockerRunTaskContext } from '../TaskHelper';
import { NetCoreRunTaskDefinition } from "../netcore/NetCoreTaskHelper";
import { NetSdkRunTaskType, getNetSdkBuildCommand, getNetSdkRunCommand } from './netSdkTaskUtils';

const NetSdkDebugTaskName = 'debug';

export type NetSdkRunTaskDefinition = NetCoreRunTaskDefinition;

export class NetSdkRunTaskProvider extends DockerTaskProvider {

    public constructor() { super(NetSdkRunTaskType, undefined); }

    public provideTasks(token: CancellationToken): Task[] {
        return []; // this task is not discoverable this way
    }

    protected async executeTaskInternal(context: DockerRunTaskContext, task: DockerRunTask): Promise<void> {
        const projectPath = task.definition.netCore?.appProject;
        const projectFolderPath = path.dirname(projectPath);

        // use dotnet to build the image
        const buildCommand = await getNetSdkBuildCommand();
        await context.terminal.execAsyncInTerminal(
            buildCommand,
            {
                folder: context.folder,
                token: context.cancellationToken,
                cwd: projectFolderPath,
            }
        );

        // use docker run to run the image
        const runCommand = await getNetSdkRunCommand(task.definition.dockerRun.image);
        await context.terminal.execAsyncInTerminal(
            runCommand,
            {
                folder: context.folder,
                token: context.cancellationToken,
                cwd: projectFolderPath,
            }
        );

        return Promise.resolve();
    }

    public createNetSdkRunTask(options?: Omit<NetSdkRunTaskDefinition, "type">): { task: Task, promise: Promise<number> } {
        let task: Task;
        const definition = {
            ...options,
            type: NetSdkRunTaskType,
        };

        const promise = new Promise<number>((resolve, reject) => {
            task = new Task(
                definition,
                TaskScope.Workspace,
                NetSdkDebugTaskName,
                NetSdkRunTaskType,
                new CustomExecution(async (resolveDefinition: TaskDefinition) => {
                    const pseudoTerminal = new DockerPseudoterminal(new NetSdkRunTaskProvider(), task, resolveDefinition);

                    const closeEventRegistration = pseudoTerminal.onDidClose((exitCode: number) => {
                        closeEventRegistration.dispose();

                        if (exitCode === 0) {
                            resolve(exitCode);
                        } else {
                            reject(exitCode);
                        }
                    });

                    return pseudoTerminal;
                }),
            );
        });

        return { task, promise };
    }
}

export const netSdkRunTaskProvider = new NetSdkRunTaskProvider();
