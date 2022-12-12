/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as os from 'os';
import * as vscode from 'vscode';
import { CommandLineArgs, CommandNotSupportedError, CommandRunner, ICommandRunnerFactory, Like, normalizeCommandResponseLike, PromiseCommandResponse, StreamingCommandRunner, VoidCommandResponse } from '../docker';

interface TaskCommandRunnerOptions {
    taskName: string;
    workspaceFolder?: vscode.WorkspaceFolder;
    cwd?: string;
    alwaysRunNew?: boolean;
    rejectOnError?: boolean;
    focus?: boolean;
    env?: never; // Environment is not needed and should not be used, because VSCode adds it already (due to using `ExtensionContext.environmentVariableCollection`)
}

export class TaskCommandRunnerFactory implements ICommandRunnerFactory {
    public constructor(private readonly options: TaskCommandRunnerOptions) {
    }

    public getCommandRunner(): CommandRunner {
        return async <T>(commandResponseLike: Like<PromiseCommandResponse<T> | VoidCommandResponse>) => {
            const commandResponse = await normalizeCommandResponseLike(commandResponseLike);
            await executeAsTask(this.options, commandResponse.command, commandResponse.args);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return undefined!;
        };
    }

    public getStreamingCommandRunner(): StreamingCommandRunner {
        throw new CommandNotSupportedError('Streaming commands are not supported for task runners');
    }
}

async function executeAsTask(options: TaskCommandRunnerOptions, command: string, args?: CommandLineArgs): Promise<void> {
    const shellExecutionOptions = { cwd: options.cwd || options.workspaceFolder?.uri?.fsPath || os.homedir() };

    const shellExecution = args ?
        new vscode.ShellExecution(command, args, shellExecutionOptions) : // Command is the process, and args contains arguments
        new vscode.ShellExecution(command, shellExecutionOptions); // Command is the full command line

    const task = new vscode.Task(
        { type: 'shell' },
        options.workspaceFolder ?? vscode.TaskScope.Workspace,
        options.taskName,
        'Containers',
        shellExecution,
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
