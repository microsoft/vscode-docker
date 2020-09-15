/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, CancellationTokenSource, Event, EventEmitter, Pseudoterminal, TaskScope, TerminalDimensions, workspace, WorkspaceFolder } from 'vscode';
import { CommandLineBuilder } from '../utils/commandLineBuilder';
import { resolveVariables } from '../utils/resolveVariables';
import { spawnAsync } from '../utils/spawnAsync';
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

    /* eslint-disable-next-line no-invalid-this */
    public readonly onDidWrite: Event<string> = this.writeEmitter.event;
    /* eslint-disable-next-line no-invalid-this */
    public readonly onDidClose: Event<number> = this.closeEmitter.event;

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
        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        this.taskProvider.executeTask(executeContext, this.task).then(result => this.close(result));
    }

    public close(code?: number): void {
        this.cts.cancel();
        this.closeEmitter.fire(code || 0);
    }

    public async executeCommandInTerminal(
        command: CommandLineBuilder,
        folder: WorkspaceFolder,
        rejectOnStderr?: boolean,
        stdoutBuffer?: Buffer,
        stderrBuffer?: Buffer,
        token?: CancellationToken): Promise<void> {
        const commandLine = resolveVariables(command.build(), folder);

        // Output what we're doing, same style as VSCode does for ShellExecution/ProcessExecution
        this.write(`> ${commandLine} <\r\n\r\n`, DEFAULTBOLD);

        // TODO: Maybe support remote Docker hosts and do addDockerSettingsToEnvironment?
        await spawnAsync(
            commandLine,
            { cwd: folder.uri.fsPath },
            (stdout: string) => {
                this.writeOutput(stdout);
            },
            stdoutBuffer,
            (stderr: string) => {
                this.writeError(stderr);

                if (rejectOnStderr) {
                    throw new Error(stderr);
                }
            },
            stderrBuffer,
            token
        );
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
