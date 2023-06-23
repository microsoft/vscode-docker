/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import { CancellationToken, CustomExecution, Task, TaskDefinition, Uri, WorkspaceFolder, workspace } from "vscode";
import { DockerPseudoterminal } from "../DockerPseudoterminal";
import { DockerTaskProvider } from '../DockerTaskProvider';
import { DockerTaskExecutionContext } from '../TaskHelper';
import { NetCoreRunTaskDefinition } from "../netcore/NetCoreTaskHelper";
import { NetSdkRunTaskType, getNetSdkBuildCommand, getNetSdkRunCommand } from './netSdkTaskUtils';

const NetSdkDebugTaskName = 'debug';

export type NetSdkRunTask = NetCoreRunTaskDefinition;

export class NetSdkRunTaskProvider extends DockerTaskProvider {

    public constructor() { super(NetSdkRunTaskType, undefined); }

    public provideTasks(token: CancellationToken): Task[] {
        return [this.createNetSdkRunTask().task];
    }

    protected async executeTaskInternal(context: DockerTaskExecutionContext, task: Task): Promise<void> {
        // use dotnet to build the image
        const buildCommand = await getNetSdkBuildCommand(context);
        await context.terminal.execAsyncInTerminal(
            buildCommand,
            {
                folder: context.folder,
                token: context.cancellationToken,
            }
        );

        // use docker run to run the image
        const runCommand = await getNetSdkRunCommand(context);
        await context.terminal.execAsyncInTerminal(
            runCommand,
            {
                folder: context.folder,
                token: context.cancellationToken,
            }
        );

        return Promise.resolve();
    }

    public createNetSdkRunTask(options?: NetSdkRunTask): { task: Task, promise: Promise<number> } {
        let task: Task;

        const promise = new Promise<number>((resolve, reject) => {
            task = new Task(
                options,
                this.getProjectFolderFromTask(options),
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

    private getProjectFolderFromTask(task: NetSdkRunTask): WorkspaceFolder {
        if (task?.netCore?.appProject) {
            const folderUri = Uri.file(path.dirname(task.netCore.appProject));
            const folder = {
                uri: folderUri,
                name: path.basename(folderUri.fsPath),
                index: 1,
            };
            return folder;
        } else {
            return workspace.workspaceFolders[0];
        }
    }
}

export const netSdkRunTaskProvider = new NetSdkRunTaskProvider();
