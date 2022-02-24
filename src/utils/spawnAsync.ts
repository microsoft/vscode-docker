/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as cp from 'child_process';
import { UserCancelledError } from '@microsoft/vscode-azext-utils';
import { CancellationToken, Disposable } from 'vscode';
import { ext } from '../extensionVariables';
import { isMac } from './osUtils';
import { localize } from '../localize';

const DEFAULT_BUFFER_SIZE = 10 * 1024; // The default Node.js `exec` buffer size is 1 MB, our actual usage is far less

export type Progress = (content: string, process: cp.ChildProcess) => void;

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type ExecError = Error & { code: any, signal: any, stdErrHandled: boolean };

export async function spawnAsync(
    command: string,
    options?: cp.SpawnOptions & { stdin?: string },
    onStdout?: Progress,
    stdoutBuffer?: Buffer,
    onStderr?: Progress,
    stderrBuffer?: Buffer,
    token?: CancellationToken): Promise<void> {

    return await new Promise((resolve, reject) => {
        let cancellationListener: Disposable;
        let stdoutBytesWritten: number = 0;
        let stderrBytesWritten: number = 0;

        // Without the shell option, it pukes on arguments
        options = options || {};
        options.shell = true;

        fixPathForMacIfNeeded(options);

        const subprocess = cp.spawn(command, options);

        subprocess.on('error', (err) => {
            if (cancellationListener) {
                cancellationListener.dispose();
                cancellationListener = undefined;
            }

            return reject(err);
        });

        subprocess.on('close', (code, signal) => {
            if (cancellationListener) {
                cancellationListener.dispose();
                cancellationListener = undefined;
            }

            if (token && token.isCancellationRequested) {
                // If cancellation is requested we'll assume that's why it exited
                return reject(new UserCancelledError());
            } else if (code) {
                let errorMessage = localize('vscode-docker.utils.spawn.exited', 'Process \'{0}\' exited with code {1}', command.length > 50 ? `${command.substring(0, 50)}...` : command, code);

                if (stderrBuffer) {
                    errorMessage += localize('vscode-docker.utils.spawn.exitedError', '\nError: {0}', bufferToString(stderrBuffer));
                }

                const error = <ExecError>new Error(errorMessage);

                error.code = code;
                error.signal = signal;
                error.stdErrHandled = onStderr !== null;

                return reject(error);
            }

            return resolve();
        });

        if (options?.stdin) {
            subprocess.stdin.write(options.stdin);
            subprocess.stdin.end();
        }

        if (onStdout || stdoutBuffer) {
            subprocess.stdout.on('data', (chunk: Buffer) => {
                const data = chunk.toString();

                if (onStdout) {
                    onStdout(data, subprocess);
                }

                if (stdoutBuffer) {
                    stdoutBytesWritten += stdoutBuffer.write(data, stdoutBytesWritten);
                }
            });
        }

        if (onStderr || stderrBuffer) {
            subprocess.stderr.on('data', (chunk: Buffer) => {
                const data = chunk.toString();

                if (onStderr) {
                    onStderr(data, subprocess);
                }

                if (stderrBuffer) {
                    stderrBytesWritten += stderrBuffer.write(data, stderrBytesWritten);
                }
            });
        }

        if (token) {
            cancellationListener = token.onCancellationRequested(() => {
                subprocess.kill();
            });
        }
    });
}

/**
 * TODO: See if this can be folded into spawnAsync().
 */
export async function spawnStreamAsync(
    command: string,
    options?: cp.SpawnOptions & { stdin?: string },
    onStdout?: (chunk: Buffer | string) => void,
    onStderr?: (chunk: Buffer | string) => void,
    token?: CancellationToken): Promise<void> {

    return await new Promise((resolve, reject) => {
        let cancellationListener: Disposable;

        // Without the shell option, it pukes on arguments
        options = options || {};
        options.shell = true;

        const process = cp.spawn(command, options);

        const errorChunks: Buffer[] = [];

        process.on('error', (err) => {
            if (cancellationListener) {
                cancellationListener.dispose();
                cancellationListener = undefined;
            }

            return reject(err);
        });

        process.on('close', (code, signal) => {
            if (cancellationListener) {
                cancellationListener.dispose();
                cancellationListener = undefined;
            }

            if (token && token.isCancellationRequested) {
                // If cancellation is requested we'll assume that's why it exited
                return reject(new UserCancelledError());
            } else if (code) {
                let errorMessage = localize('vscode-docker.utils.spawn.exited', 'Process \'{0}\' exited with code {1}', command.length > 50 ? `${command.substring(0, 50)}...` : command, code);

                errorMessage += localize('vscode-docker.utils.spawn.exitedError', '\nError: {0}', bufferToString(Buffer.concat(errorChunks)));

                const error = <ExecError>new Error(errorMessage);

                error.code = code;
                error.signal = signal;
                error.stdErrHandled = false;

                return reject(error);
            }

            return resolve();
        });

        if (options?.stdin) {
            process.stdin.write(options.stdin);
            process.stdin.end();
        }

        if (onStdout) {
            process.stdout.on('data', (chunk: Buffer) => {
                if (onStdout) {
                    onStdout(chunk);
                }
            });
        }

        if (onStderr) {
            process.stderr.on('data', (chunk: Buffer) => {
                errorChunks.push(chunk);

                if (onStderr) {
                    onStderr(chunk);
                }
            });
        }

        if (token) {
            cancellationListener = token.onCancellationRequested(() => {
                process.kill();
            });
        }
    });
}

export async function execAsync(command: string, options?: cp.ExecOptions & { stdin?: string }, progress?: (content: string, process: cp.ChildProcess) => void): Promise<{ stdout: string, stderr: string }> {
    const stdoutBuffer = Buffer.alloc(options && options.maxBuffer || DEFAULT_BUFFER_SIZE);
    const stderrBuffer = Buffer.alloc(options && options.maxBuffer || DEFAULT_BUFFER_SIZE);

    await spawnAsync(command, options as cp.CommonOptions, progress, stdoutBuffer, progress, stderrBuffer);

    return {
        stdout: bufferToString(stdoutBuffer),
        stderr: bufferToString(stderrBuffer),
    };
}

/**
 * TODO: See if this can be folded into execAsync().
 */
export async function execStreamAsync(
    command: string,
    options?: cp.ExecOptions & { stdin?: string },
    token?: CancellationToken): Promise<{ stdout: string, stderr: string }> {
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    await spawnStreamAsync(
        command,
        options as cp.CommonOptions,
        chunk => stdoutChunks.push(chunk as Buffer),
        chunk => stderrChunks.push(chunk as Buffer),
        token);

    return {
        stdout: bufferToString(Buffer.concat(stdoutChunks)),
        stderr: bufferToString(Buffer.concat(stderrChunks)),
    };
}

export function bufferToString(buffer: Buffer): string {
    // Remove non-printing control characters and trailing newlines
    // eslint-disable-next-line no-control-regex
    return buffer.toString().replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F]|\r?\n$/g, '');
}

function fixPathForMacIfNeeded(options: cp.SpawnOptions): void {
    if (!isMac()) {
        // Do nothing: not Mac
        return;
    }

    // Looks for `/usr/local/bin` in the PATH.
    // Must be whole, i.e. the left side must be the beginning of the string or :, and the right side must be the end of the string or :
    // Case-insensitive, because Mac is
    if (/(?<=^|:)\/usr\/local\/bin(?=$|:)/i.test(options?.env?.PATH || process.env.PATH)) {
        // Do nothing: PATH already contains `/usr/local/bin`
        return;
    }

    options = options ?? {};
    options.env = options.env ?? { ...process.env };

    ext.outputChannel.appendLine(localize('vscode-docker.utils.spawn.fixedPath', 'WARNING: Adding \'/usr/local/bin\' to the PATH because it is missing.'));

    // Put `/usr/local/bin` on the PATH at the end
    options.env.PATH = `${options.env.PATH}:/usr/local/bin`;
}
