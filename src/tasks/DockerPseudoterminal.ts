/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, CancellationTokenSource, Event, EventEmitter, Pseudoterminal, TaskScope, TerminalDimensions, workspace, WorkspaceFolder } from 'vscode';
import { CommandLineBuilder } from '../utils/commandLineBuilder';
import { getCoreNodeModule } from '../utils/getCoreNodeModule';
import { isWindows } from '../utils/osUtils';
import { resolveVariables } from '../utils/resolveVariables';
import { ExecError } from '../utils/spawnAsync';
import { DockerBuildTask, DockerBuildTaskDefinition } from './DockerBuildTaskProvider';
import { DockerRunTask, DockerRunTaskDefinition } from './DockerRunTaskProvider';
import { DockerTaskProvider } from './DockerTaskProvider';
import { DockerTaskExecutionContext } from './TaskHelper';

const DEFAULT = '0m';
const DEFAULTBOLD = '0;1m';
const RED = '31m';
const YELLOW = '33m';

export class DockerPseudoterminal implements Pseudoterminal {
    private readonly closeEmitter: EventEmitter<number> = new EventEmitter<number>();
    private readonly writeEmitter: EventEmitter<string> = new EventEmitter<string>();
    private readonly cts: CancellationTokenSource = new CancellationTokenSource();

    private initialDimensions: TerminalDimensions;
    private activePty: IPty;

    /* eslint-disable no-invalid-this */
    public readonly onDidWrite: Event<string> = this.writeEmitter.event;
    public readonly onDidClose: Event<number> = this.closeEmitter.event;
    /* eslint-enable no-invalid-this */

    public constructor(private readonly taskProvider: DockerTaskProvider, private readonly task: DockerBuildTask | DockerRunTask, private readonly resolvedDefinition: DockerBuildTaskDefinition | DockerRunTaskDefinition) { }

    public open(initialDimensions: TerminalDimensions | undefined): void {
        const folder = this.task.scope === TaskScope.Workspace
            ? workspace.workspaceFolders[0]
            : this.task.scope as WorkspaceFolder;

        this.initialDimensions = initialDimensions;

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

    public async executeCommandInTerminal(
        command: CommandLineBuilder,
        folder: WorkspaceFolder,
        token?: CancellationToken): Promise<void> {
        const commandLine = resolveVariables(command.build(), folder);

        // Output what we're doing, same style as VSCode does for ShellExecution/ProcessExecution
        this.write(`> ${commandLine} <\r\n\r\n`, DEFAULTBOLD);

        const pty = getCoreNodeModule<nodepty>('node-pty');

        this.activePty = pty.spawn(isWindows() ? 'powershell.exe' : 'sh', ['-c', commandLine], {
            name: 'xterm-color',
            cols: this.initialDimensions?.columns,
            rows: this.initialDimensions?.rows,
            cwd: folder.uri.fsPath,
            env: process.env,
        });

        return new Promise((resolve, reject) => {
            const dataDisposable = this.activePty.onData((e: string) => this.writeEmitter.fire(e));
            const exitDisposable = this.activePty.onExit(
                (e: { exitCode: number, signal?: number }) => {
                    dataDisposable.dispose();
                    exitDisposable.dispose();

                    if (e.exitCode) {
                        const error = <ExecError>new Error();
                        error.code = e.exitCode;
                        error.signal = e.signal;
                        reject(error);
                    }

                    resolve();
                }
            );

            const cancelDisposable = token?.onCancellationRequested(() => {
                cancelDisposable.dispose();
                this.activePty.kill();
            });
        });
    }

    public setDimensions(dimensions: TerminalDimensions): void {
        // In case this gets called before executeCommandInTerminal, we'll overwrite this.initialDimensions
        this.initialDimensions = dimensions;

        void this.activePty?.resize(dimensions.columns, dimensions.rows);
    }

    public writeOutput(message: string): void {
        this.write(message, DEFAULT);
    }

    public writeWarning(message: string): void {
        this.write(message, YELLOW);
    }

    public writeError(message: string): void {
        this.write(message, RED);
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
}

/**
 * Loosely based on https://github.com/microsoft/node-pty/blob/master/typings/node-pty.d.ts, but downloading that is difficult and actually installing
 * the node-pty package is even more difficult (lots of native code)
 */
interface nodepty {
    spawn(file: string, args: string[] | string, options: unknown): IPty;
}

/**
 * Loosely based on IPty in https://github.com/microsoft/node-pty/blob/master/typings/node-pty.d.ts
 */
interface IPty {
    kill(): void,
    resize(columns: number, rows: number): void;
    onData: Event<string>;
    onExit: Event<{ exitCode: number, signal?: number }>;
}
