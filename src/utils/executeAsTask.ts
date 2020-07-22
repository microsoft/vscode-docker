/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as os from 'os';
import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { addDockerSettingsToEnv } from './addDockerSettingsToEnv';

export async function executeAsTask(context: IActionContext, command: string, name: string, options: { addDockerEnv?: boolean, workspaceFolder?: vscode.WorkspaceFolder, cwd?: string }): Promise<vscode.TaskExecution> {
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

    return vscode.tasks.executeTask(task);
}
