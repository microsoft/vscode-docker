/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as os from 'os';
import * as vscode from 'vscode';
import { CommandResponseLike, CommandRunner, normalizeCommandResponseLike } from "@microsoft/container-runtimes";

interface ExecuteAsTaskOptions {
    taskName: string;
    workspaceFolder?: vscode.WorkspaceFolder;
    cwd?: string;
    alwaysRunNew?: boolean;
    rejectOnError?: boolean;
    focus?: boolean;
}

export const ExecuteAsTaskRunner: CommandRunner = async <T>(commandResponseLike: CommandResponseLike<T>, options: ExecuteAsTaskOptions): Promise<never> => {
    const commandResponse = await normalizeCommandResponseLike(commandResponseLike);
    const task = new vscode.Task(
        { type: 'shell' },
        options.workspaceFolder ?? vscode.TaskScope.Workspace,
        options.taskName,
        'Docker',
        new vscode.ShellExecution(commandResponse.command, commandResponse.args, { cwd: options.cwd || options.workspaceFolder?.uri?.fsPath || os.homedir() }),
        [] // problemMatchers
    );

    if (options.alwaysRunNew) {
        // If the command should always run in a new task (even if an identical command is still running), add a random value to the definition
        // This will cause a new task to be run even if one with an identical command line is already running
        task.definition.idRandomizer = Math.random();
    }

    if (options.focus) {
        task.presentationOptions = {
            focus: true,
        };
    }

    const taskExecution = await vscode.tasks.executeTask(task);

    const taskEndPromise = new Promise<never>((resolve, reject) => {
        const disposable = vscode.tasks.onDidEndTaskProcess(e => {
            if (e.execution === taskExecution) {
                disposable.dispose();

                if (e.exitCode && options.rejectOnError) {
                    reject(e.exitCode);
                }

                resolve(undefined);
            }
        });
    });

    return taskEndPromise;
};
