/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommandResponse, Shell } from '../runtimes/docker';
import { CancellationToken, CancellationTokenSource, Event, EventEmitter, Pseudoterminal, TaskScope, TerminalDimensions, WorkspaceFolder, workspace } from 'vscode';
import { resolveVariables } from '../utils/resolveVariables';
import { execAsync, ExecAsyncOutput } from '../utils/execAsync';
import { DockerBuildTask, DockerBuildTaskDefinition } from './DockerBuildTaskProvider';
import { DockerRunTask, DockerRunTaskDefinition } from './DockerRunTaskProvider';
import { DockerTaskProvider } from './DockerTaskProvider';
import { DockerTaskExecutionContext } from './TaskHelper';
import { withDockerEnvSettings } from '../utils/withDockerEnvSettings';

const DEFAULT = '0m';
const DEFAULTBOLD = '0;1m';
const YELLOW = '33m';

export class DockerPseudoterminal implements Pseudoterminal {
    private readonly closeEmitter: EventEmitter<number> = new EventEmitter<number>();
    private readonly writeEmitter: EventEmitter<string> = new EventEmitter<string>();
    private readonly cts: CancellationTokenSource = new CancellationTokenSource();

    /* eslint-disable no-invalid-this */
    public readonly onDidWrite: Event<string> = this.writeEmitter.event;
    public readonly onDidClose: Event<number> = this.closeEmitter.event;
    /* eslint-enable no-invalid-this */

    public constructor(private readonly taskProvider: DockerTaskProvider, private readonly task: DockerBuildTask | DockerRunTask, private readonly resolvedDefinition: DockerBuildTaskDefinition | DockerRunTaskDefinition) { }

    public open(initialDimensions: TerminalDimensions | undefined): void {
        const folder = this.task.scope === TaskScope.Workspace
            ? workspace.workspaceFolders[0]
            : this.task.scope as WorkspaceFolder;

        const executeContext: DockerTaskExecutionContext = {
            folder,
            cancellationToken: this.cts.token,
            terminal: this,
        };

        this.task.definition = this.resolvedDefinition;

        // We intentionally don't have an error handler in the then() below. DockerTaskProvider.executeTask() cannot throw--errors will be caught and some nonzero integer returned.
        // Can't wait here
        void this.taskProvider.executeTask(executeContext, this.task).then(result => this.close(result));
    }

    public close(code?: number): void {
        this.cts.cancel();
        this.closeEmitter.fire(code || 0);
    }

    public getCommandRunner(options: Omit<ExecuteCommandInTerminalOptions, 'commandResponse'>): (commandResponse: CommandResponse<unknown>) => Promise<ExecAsyncOutput> {
        return async (commandResponse: CommandResponse<unknown>) => {
            return await this.executeCommandInTerminal({
                ...options,
                commandResponse: commandResponse,
            });
        };
    }

    public writeOutput(message: string): void {
        this.write(message, DEFAULT);
    }

    public writeWarning(message: string): void {
        this.write(message, YELLOW);
    }

    public writeError(message: string): void {
        this.write(message, DEFAULT);
    }

    public writeOutputLine(message: string): void {
        this.writeOutput(`${message}\r\n`); // The carriage return (/r) is necessary or the pseudoterminal does not return back to the start of line
    }

    public writeWarningLine(message: string): void {
        this.writeWarning(`${message}\r\n`); // The carriage return (/r) is necessary or the pseudoterminal does not return back to the start of line
    }

    public writeErrorLine(message: string): void {
        this.writeError(`${message}\r\n`); // The carriage return (/r) is necessary or the pseudoterminal does not return back to the start of line
    }

    private write(message: string, color: string): void {
        message = message.replace(/\r?\n/g, '\r\n'); // The carriage return (/r) is necessary or the pseudoterminal does not return back to the start of line
        this.writeEmitter.fire(`\x1b[${color}${message}\x1b[0m`);
    }

    private async executeCommandInTerminal(options: ExecuteCommandInTerminalOptions): Promise<ExecAsyncOutput> {
        const quotedArgs = Shell.getShellOrDefault().quote(options.commandResponse.args);
        const resolvedQuotedArgs = resolveVariables(quotedArgs, options.folder);
        const commandLine = [options.commandResponse.command, ...resolvedQuotedArgs].join(' ');

        // Output what we're doing, same style as VSCode does for ShellExecution/ProcessExecution
        this.write(`> ${commandLine} <\r\n\r\n`, DEFAULTBOLD);

        return await execAsync(
            commandLine,
            {
                cwd: this.resolvedDefinition.options?.cwd || options.folder.uri.fsPath,
                env: withDockerEnvSettings({ ...process.env, ...this.resolvedDefinition.options?.env }),
                cancellationToken: options.token,
            },
            (output: string, err: boolean) => {
                if (err) {
                    this.writeError(output);

                    if (options.rejectOnStderr) {
                        throw new Error(output);
                    }
                } else {
                    this.writeOutput(output);
                }
            }
        );
    }
}

type ExecuteCommandInTerminalOptions = {
    commandResponse: CommandResponse<unknown>;
    folder: WorkspaceFolder;
    rejectOnStderr?: boolean;
    token?: CancellationToken;
};
