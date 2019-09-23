/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as cp from 'child_process';
import { CancellationTokenSource, Event, EventEmitter, Pseudoterminal, TerminalDimensions, WorkspaceFolder } from 'vscode';
import { CommandLineBuilder } from '../utils/commandLineBuilder';
import { DockerBuildTask } from './DockerBuildTaskProvider';
import { DockerRunTask } from './DockerRunTaskProvider';
import { DockerTaskProviderBase } from './DockerTaskProviderBase';
import { DockerTaskExecutionContext } from './TaskHelper';

export class DockerPseudoShell implements Pseudoterminal {
    private readonly closeEmitter: EventEmitter<number> = new EventEmitter<number>();
    private readonly writeEmitter: EventEmitter<string> = new EventEmitter<string>();
    private readonly cts: CancellationTokenSource = new CancellationTokenSource();

    public onDidWrite: Event<string> = this.writeEmitter.event;
    public onDidClose: Event<number> = this.closeEmitter.event;

    constructor(private readonly taskProvider: DockerTaskProviderBase, private readonly task: DockerBuildTask | DockerRunTask) { }

    public async open(initialDimensions: TerminalDimensions | undefined): Promise<void> {
        const executeContext: DockerTaskExecutionContext = {
            folder: this.task.scope as WorkspaceFolder,
            cancellationToken: this.cts.token,
            shell: this,
        }

        const result = await this.taskProvider.executeTask(executeContext, this.task);
        this.close(result);
    }

    public close(code?: number): void {
        this.cts.cancel();
        this.closeEmitter.fire(code || 0);
    }

    public async executeCommandInTerminal(command: CommandLineBuilder, rejectOnStdError?: boolean): Promise<{ stdout: string, stderr: string }> {
        const commandLine = command.build();
        this.writeOutputLine(commandLine);
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

            process.stderr.on('data', (chunk: Buffer) => this.writeError(chunk.toString()));
            process.stdout.on('data', (chunk: Buffer) => this.writeOutput(chunk.toString()));
        });
    }

    public writeOutput(message: string): void {
        this.writeEmitter.fire(message)
    }

    public writeWarning(message: string): void {
        this.writeEmitter.fire(`\x1b[33m${message}\x1b[0m`)
    }

    public writeError(message: string): void {
        this.writeEmitter.fire(`\x1b[31m${message}\x1b[0m`);
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
}
