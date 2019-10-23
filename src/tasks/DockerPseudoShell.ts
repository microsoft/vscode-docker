/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as cp from 'child_process';
import { CancellationToken, CancellationTokenSource, Event, EventEmitter, Pseudoterminal, TerminalDimensions, WorkspaceFolder } from 'vscode';
import { CommandLineBuilder } from '../utils/commandLineBuilder';
import { resolveVariables } from '../utils/resolveVariables';
import { DockerBuildTask } from './DockerBuildTaskProvider';
import { DockerRunTask } from './DockerRunTaskProvider';
import { DockerTaskProviderBase } from './DockerTaskProviderBase';
import { DockerTaskExecutionContext } from './TaskHelper';

const DEFAULT = '0m';
const DEFAULTBOLD = '0;1m';
const RED = '31m';
const YELLOW = '33m';

export class DockerPseudoShell implements Pseudoterminal {
    private readonly closeEmitter: EventEmitter<number> = new EventEmitter<number>();
    private readonly writeEmitter: EventEmitter<string> = new EventEmitter<string>();
    private readonly cts: CancellationTokenSource = new CancellationTokenSource();

    public onDidWrite: Event<string> = this.writeEmitter.event;
    public onDidClose: Event<number> = this.closeEmitter.event;

    constructor(private readonly taskProvider: DockerTaskProviderBase, private readonly task: DockerBuildTask | DockerRunTask) { }

    public open(initialDimensions: TerminalDimensions | undefined): void {
        const executeContext: DockerTaskExecutionContext = {
            folder: this.task.scope as WorkspaceFolder,
            cancellationToken: this.cts.token,
            shell: this,
        }

        // Can't wait here
        // tslint:disable-next-line: no-floating-promises
        this.taskProvider.executeTask(executeContext, this.task).then(result => this.close(result));
    }

    public close(code?: number): void {
        this.cts.cancel();
        this.closeEmitter.fire(code || 0);
    }

    public async executeCommandInTerminal(command: CommandLineBuilder, folder: WorkspaceFolder, rejectOnStdError?: boolean, token?: CancellationToken): Promise<{ stdout: string, stderr: string }> {
        const commandLine = resolveVariables(command.build(), folder);

        // Output what we're doing, same style as VSCode does for ShellExecution/ProcessExecution
        this.write(`> Executing task: ${commandLine} <\r\n\r\n`, DEFAULTBOLD);

        // TODO: Maybe support remote Docker hosts and do addDockerSettingsToEnvironment?
        return new Promise<{ stdout: string, stderr: string }>((resolve, reject) => {
            const process = cp.exec(commandLine, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                }

                if (stderr && rejectOnStdError) {
                    reject(stderr);
                }

                resolve({ stdout, stderr });
            });

            if (token) {
                const cancelHandler = token.onCancellationRequested(() => {
                    process.kill();
                });
                process.on('exit', () => {
                    cancelHandler.dispose();
                });
            }

            process.stderr.on('data', (chunk: Buffer) => this.writeError(chunk.toString()));
            process.stdout.on('data', (chunk: Buffer) => this.writeOutput(chunk.toString()));
        });
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
