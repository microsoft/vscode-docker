/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as cp from 'child_process';
import * as stream from 'stream';
import { AccumulatorStream, spawnStreamAsync, StreamSpawnOptions } from '@microsoft/container-runtimes';
import { CancellationToken } from 'vscode';

type Progress = (content: string, err: boolean) => void;

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type ExecError = Error & { code: any, signal: any, stdErrHandled: boolean };

export type ExecAsyncOutput = { stdout: string, stderr: string };

export async function execAsync(command: string, options?: cp.ExecOptions & { stdin?: string, cancellationToken?: CancellationToken }, progress?: Progress): Promise<ExecAsyncOutput> {
    const stdoutFinal = new AccumulatorStream();
    const stderrFinal = new AccumulatorStream();

    let stdinPipe: stream.Readable | undefined;
    if (options.stdin) {
        stdinPipe = stream.Readable.from(options.stdin);
    }

    let stdoutIntermediate: stream.PassThrough | undefined;
    let stderrIntermediate: stream.PassThrough | undefined;
    if (progress) {
        stdoutIntermediate = new stream.PassThrough();
        stdoutIntermediate.on('data', (chunk: Buffer) => {
            progress(bufferToString(chunk), false);
        });
        stdoutIntermediate.pipe(stdoutFinal);

        stderrIntermediate = new stream.PassThrough();
        stderrIntermediate.on('data', (chunk: Buffer) => {
            progress(bufferToString(chunk), true);
        });
        stderrIntermediate.pipe(stderrFinal);
    }

    const spawnOptions: StreamSpawnOptions = {
        ...options,
        stdInPipe: stdinPipe,
        stdOutPipe: stdoutIntermediate ?? stdoutFinal,
        stdErrPipe: stderrIntermediate ?? stderrFinal,
    };

    await spawnStreamAsync(command, [], spawnOptions);

    return {
        stdout: await stdoutFinal.getString(),
        stderr: await stderrFinal.getString(),
    };
}

export function bufferToString(buffer: Buffer): string {
    // Remove non-printing control characters and trailing newlines
    // eslint-disable-next-line no-control-regex
    return buffer.toString().replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F]|\r?\n$/g, '');
}
