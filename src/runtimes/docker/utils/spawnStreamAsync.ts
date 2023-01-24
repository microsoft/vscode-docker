/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { spawn, SpawnOptions } from 'child_process';
import * as os from 'os';
import * as stream from 'stream';
import * as treeKill from 'tree-kill';
import { ShellQuotedString, ShellQuoting } from 'vscode';
import { ext } from '../../../extensionVariables';
import { IShell } from '../contracts/Shell';

import { CancellationTokenLike } from '../typings/CancellationTokenLike';
import { CancellationError } from './CancellationError';
import { ChildProcessError } from './ChildProcessError';
import { CommandLineArgs } from './commandLineBuilder';

/**
 * A {@link Shell} class applies quoting rules for a specific shell.
 * Quoth the cmd.exe 'nevermore'.
 */
export abstract class Shell implements IShell {
    public static getShellOrDefault(shell?: Shell | null | undefined): Shell {
        if (shell) {
            return shell;
        }

        if (os.platform() === 'win32') {
            return new Cmd();
        } else {
            return new Bash();
        }
    }

    /**
     * Expands ShellQuotedString for a specific shell
     * @param args Array of {@link CommandLineArgs} to expand
     */
    public abstract quote(args: CommandLineArgs): Array<string>;

    /**
     * Apply shell specific escaping rules to a Go Template string
     * @param arg The string to apply Go Template specific escaping rules for a given shell
     * @param quoting A {@link ShellQuotedString} that is properly escaped for Go Templates in the given shell
     */
    public goTemplateQuotedString(arg: string, quoting: ShellQuoting): ShellQuotedString {
        return {
            value: arg,
            quoting,
        };
    }

    public getShellOrDefault(shell?: string | boolean): string | boolean | undefined {
        return shell;
    }
}

/**
 * Quoting/escaping rules for Powershell shell
 */
export class Powershell extends Shell {
    public quote(args: CommandLineArgs): Array<string> {
        const escape = (value: string) => `\`${value}`;

        return args.map((quotedArg) => {
            // If it's a verbatim argument, return it as-is.
            // The overwhelming majority of arguments are `ShellQuotedString`, so
            // verbatim arguments will only show up if `withVerbatimArg` is used.
            if (typeof quotedArg === 'string') {
                return quotedArg;
            }

            switch (quotedArg.quoting) {
                case ShellQuoting.Escape:
                    return quotedArg.value.replace(/[ "'()]/g, escape);
                case ShellQuoting.Weak:
                    return `"${quotedArg.value.replace(/["]/g, escape)}"`;
                case ShellQuoting.Strong:
                    return `'${quotedArg.value.replace(/[']/g, escape)}'`;
            }
        });
    }

    public override goTemplateQuotedString(arg: string, quoting: ShellQuoting): ShellQuotedString {
        switch (quoting) {
            case ShellQuoting.Escape:
                return { value: arg, quoting };
            case ShellQuoting.Weak:
            case ShellQuoting.Strong:
                return {
                    value: arg.replace(/["]/g, (value) => `\\${value}`),
                    quoting,
                };
        }
    }

    public override getShellOrDefault(shell?: string | boolean | undefined): string | boolean | undefined {
        if (typeof shell !== 'string' && shell !== false) {
            return 'powershell.exe';
        }

        return shell;
    }
}

/**
 * Quoting/escaping rules for bash/zsh shell
 */
export class Bash extends Shell {
    public quote(args: CommandLineArgs): Array<string> {
        const escape = (value: string) => `\\${value}`;

        return args.map((quotedArg) => {
            // If it's a verbatim argument, return it as-is.
            // The overwhelming majority of arguments are `ShellQuotedString`, so
            // verbatim arguments will only show up if `withVerbatimArg` is used.
            if (typeof quotedArg === 'string') {
                return quotedArg;
            }

            switch (quotedArg.quoting) {
                case ShellQuoting.Escape:
                    return quotedArg.value.replace(/[ "']/g, escape);
                case ShellQuoting.Weak:
                    return `"${quotedArg.value.replace(/["]/g, escape)}"`;
                case ShellQuoting.Strong:
                    return `'${quotedArg.value.replace(/[']/g, escape)}'`;
            }
        });
    }
}

/**
 * Quoting/escaping rules for cmd shell
 */
export class Cmd extends Shell {
    public quote(args: CommandLineArgs): Array<string> {
        const escapeQuote = (value: string) => `\\${value}`;
        const escape = (value: string) => `^${value}`;

        return args.map((quotedArg) => {
            // If it's a verbatim argument, return it as-is.
            // The overwhelming majority of arguments are `ShellQuotedString`, so
            // verbatim arguments will only show up if `withVerbatimArg` is used.
            if (typeof quotedArg === 'string') {
                return quotedArg;
            }

            switch (quotedArg.quoting) {
                case ShellQuoting.Escape:
                    return quotedArg.value.replace(/[ "^&\\<>|]/g, escape);
                case ShellQuoting.Weak:
                    return quotedArg.value.replace(/[ "^&\\<>|]/g, escape);
                case ShellQuoting.Strong:
                    return `"${quotedArg.value.replace(/["]/g, escapeQuote)}"`;
            }
        });
    }
}

/**
 * Quoting/escaping rules for no shell
 */
export class NoShell extends Shell {
    private readonly isWindows: boolean;

    public constructor(isWindows?: boolean) {
        super();

        this.isWindows = typeof isWindows === 'boolean' ? isWindows : os.platform() === 'win32';
    }

    public quote(args: CommandLineArgs): Array<string> {
        const windowsEscape = (value: string) => `\\${value}`;

        return args.map((quotedArg) => {
            // If it's a verbatim argument, return it as-is.
            // The overwhelming majority of arguments are `ShellQuotedString`, so
            // verbatim arguments will only show up if `withVerbatimArg` is used.
            if (typeof quotedArg === 'string') {
                return quotedArg;
            }

            // Windows requires special quoting behavior even when running without a shell
            // to allow us to use windowsVerbatimArguments: true
            if (this.isWindows) {
                switch (quotedArg.quoting) {
                    case ShellQuoting.Weak:
                    case ShellQuoting.Strong:
                        return `"${quotedArg.value.replace(/["]/g, windowsEscape)}"`;
                    default:
                        return quotedArg.value;
                }
            }

            return quotedArg.value;
        });
    }

    public override getShellOrDefault(shell?: string | boolean | undefined): string | boolean | undefined {
        return false;
    }
}

export type StreamSpawnOptions = SpawnOptions & {
    onCommand?: (command: string) => void;
    cancellationToken?: CancellationTokenLike;
    shellProvider?: Shell;

    stdInPipe?: NodeJS.ReadableStream;
    stdOutPipe?: NodeJS.WritableStream;
    stdErrPipe?: NodeJS.WritableStream;
};

export async function spawnStreamAsync(
    command: string,
    args: CommandLineArgs,
    options: StreamSpawnOptions,
): Promise<void> {
    const cancellationToken = options.cancellationToken || CancellationTokenLike.None;
    // Force PowerShell as the default on Windows, but use the system default on
    // *nix
    const shell = options.shellProvider?.getShellOrDefault(options.shell) ?? options.shell;

    // If there is a shell provider, apply its quoting, otherwise just flatten arguments into strings
    const normalizedArgs: string[] = options.shellProvider?.quote(args) ?? args.map(arg => typeof arg === 'string' ? arg : arg.value);

    if (cancellationToken.isCancellationRequested) {
        throw new CancellationError('Command cancelled', cancellationToken);
    }

    if (options.onCommand) {
        options.onCommand([command, ...normalizedArgs].join(' '));
    }

    let stdOutPipe: NodeJS.WritableStream | undefined = options.stdOutPipe;
    let stdErrPipe: NodeJS.WritableStream | undefined = options.stdErrPipe;
    if (ext.diagnosticLogging) {
        ext.outputChannel.appendLine([command, ...normalizedArgs].join(' '));

        const diagnosticStdOutPipe = new stream.PassThrough();
        diagnosticStdOutPipe.on('data', (chunk: Buffer) => {
            try {
                ext.outputChannel.appendLine(chunk.toString());
            } catch {
                // Do not throw on diagnostic errors
            }
        });

        if (stdOutPipe) {
            diagnosticStdOutPipe.pipe(stdOutPipe);
        }
        stdOutPipe = diagnosticStdOutPipe;

        const diagnosticStdErrPipe = new stream.PassThrough();
        diagnosticStdErrPipe.on('data', (chunk: Buffer) => {
            try {
                ext.outputChannel.appendLine('stderr: ' + chunk.toString());
            } catch {
                // Do not throw on diagnostic errors
            }
        });

        if (stdErrPipe) {
            diagnosticStdErrPipe.pipe(stdErrPipe);
        }
        stdErrPipe = diagnosticStdErrPipe;
    }

    const childProcess = spawn(
        command,
        normalizedArgs,
        {
            ...options,
            shell,
            // Ignore stdio streams if not needed to avoid backpressure issues
            stdio: [
                options.stdInPipe ? 'pipe' : 'ignore',
                stdOutPipe ? 'pipe' : 'ignore',
                stdErrPipe ? 'pipe' : 'ignore',
            ],
        },
    );

    if (options.stdInPipe && childProcess.stdin) {
        options.stdInPipe.pipe(childProcess.stdin);
    }

    if (stdOutPipe && childProcess.stdout) {
        childProcess.stdout.pipe(stdOutPipe);
    }

    if (stdErrPipe && childProcess.stderr) {
        childProcess.stderr.pipe(stdErrPipe);
    }

    return new Promise<void>((resolve, reject) => {
        const disposable = cancellationToken.onCancellationRequested(() => {
            disposable.dispose();
            stdOutPipe?.end();
            stdErrPipe?.end();
            childProcess.removeAllListeners();

            if (childProcess.pid) {
                treeKill(childProcess.pid);
            }

            if (ext.diagnosticLogging) {
                try {
                    ext.outputChannel.appendLine('error: Command cancelled');
                } catch {
                    // Do not throw on diagnostic errors
                }
            }

            reject(new CancellationError('Command cancelled', cancellationToken));
        });

        // Reject the promise on an error event
        childProcess.on('error', (err) => {
            disposable.dispose();

            if (ext.diagnosticLogging) {
                try {
                    ext.outputChannel.appendLine(`error: ${err.message}`);
                } catch {
                    // Do not throw on diagnostic errors
                }
            }

            reject(err);
        });

        // Complete the promise when the process exits
        childProcess.on('exit', (code, signal) => {
            disposable.dispose();
            if (code === 0) {
                resolve();
            } else if (signal) {
                if (ext.diagnosticLogging) {
                    try {
                        ext.outputChannel.appendLine(`error: Process exited due to signal ${signal}`);
                    } catch {
                        // Do not throw on diagnostic errors
                    }
                }

                reject(new ChildProcessError(`Process exited due to signal ${signal}`, code, signal));
            } else {
                if (ext.diagnosticLogging) {
                    try {
                        ext.outputChannel.appendLine(`error: Process exited with code ${code}`);
                    } catch {
                        // Do not throw on diagnostic errors
                    }
                }

                reject(new ChildProcessError(`Process exited with code ${code}`, code, signal));
            }
        });
    });
}
