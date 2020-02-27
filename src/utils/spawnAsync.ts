/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as cp from 'child_process';
import { CancellationToken, Disposable } from 'vscode';
import { UserCancelledError } from 'vscode-azureextensionui';
import { localize } from '../localize';

const DEFAULT_BUFFER_SIZE = 10 * 1024; // The default Node.js `exec` buffer size is 1 MB, our actual usage is far less

export type Progress = (content: string, process: cp.ChildProcess) => void;

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type ExecError = Error & { code: any, signal: any };

export async function spawnAsync(
    command: string,
    options?: cp.SpawnOptions,
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

        const process = cp.spawn(command, options);

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
                // Replicate the error object of child_process.exec().
                const error = <ExecError>new Error(localize('vscode-docker.utils.spawn.exited', 'Process exited with code {0}', code));
                error.code = code;
                error.signal = signal;
                return reject(error);
            }

            return resolve();
        });

        if (onStdout || stdoutBuffer) {
            process.stdout.on('data', (chunk: Buffer) => {
                const data = chunk.toString();

                if (onStdout) {
                    onStdout(data, process);
                }

                if (stdoutBuffer) {
                    stdoutBytesWritten += stdoutBuffer.write(data, stdoutBytesWritten);
                }
            });
        }

        if (onStderr || stderrBuffer) {
            process.stderr.on('data', (chunk: Buffer) => {
                const data = chunk.toString();

                if (onStderr) {
                    onStderr(data, process);
                }

                if (stderrBuffer) {
                    stderrBytesWritten += stderrBuffer.write(data, stderrBytesWritten);
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

export async function execAsync(command: string, options?: cp.ExecOptions, progress?: (content: string, process: cp.ChildProcess) => void): Promise<{ stdout: string, stderr: string }> {
    const stdoutBuffer = Buffer.alloc(options && options.maxBuffer || DEFAULT_BUFFER_SIZE);
    const stderrBuffer = Buffer.alloc(options && options.maxBuffer || DEFAULT_BUFFER_SIZE);

    await spawnAsync(command, options as cp.CommonOptions, progress, stdoutBuffer, progress, stderrBuffer);

    return {
        stdout: bufferToString(stdoutBuffer),
        stderr: bufferToString(stderrBuffer),
    }
}

function bufferToString(buffer: Buffer): string {
    // Node.js treats null bytes as part of the length, which makes everything mad
    // There's also a trailing newline everything hates, so we'll remove
    return buffer.toString().replace(/\0/g, '').replace(/\r?\n$/g, '');
}
