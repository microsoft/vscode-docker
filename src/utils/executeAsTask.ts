/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as os from 'os';
import * as vscode from 'vscode';
import { IActionContext } from '@microsoft/vscode-azext-utils';
import { addDockerSettingsToEnv } from './addDockerSettingsToEnv';

interface ExecuteAsTaskOptions {
    addDockerEnv?: boolean;
    workspaceFolder?: vscode.WorkspaceFolder;
    cwd?: string;
    alwaysRunNew?: boolean;
    rejectOnError?: boolean;
    focus?: boolean;
}

export async function executeAsTask(context: IActionContext, command: string, name: string, options: ExecuteAsTaskOptions): Promise<void> {
    let newEnv: NodeJS.ProcessEnv | undefined;
    options = options ?? {};

    if (options.addDockerEnv) {
        // We don't need to merge process.env into newEnv, since ShellExecution does that automatically via ShellExecutionOptions
        newEnv = {};
        addDockerSettingsToEnv(newEnv, process.env);
    }

    const task = new vscode.Task(
        { type: 'shell' },
        options.workspaceFolder ?? vscode.TaskScope.Workspace,
        name,
        'Docker',
        new vscode.ShellExecution(command, { cwd: options.cwd || options.workspaceFolder?.uri?.fsPath || os.homedir(), env: newEnv }),
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

    const taskEndPromise = new Promise<void>((resolve, reject) => {
        const disposable = vscode.tasks.onDidEndTaskProcess(e => {
            if (e.execution === taskExecution) {
                disposable.dispose();

                if (e.exitCode && options.rejectOnError) {
                    reject(e.exitCode);
                }

                resolve();
            }
        });
    });

    return taskEndPromise;
}
