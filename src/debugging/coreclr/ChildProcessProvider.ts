/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as cp from 'child_process';
import * as process from 'process';

export type ProcessProviderExecOptions = cp.ExecOptions & { progress?(content: string, process: cp.ChildProcess): void };

export interface ProcessProvider {
    env: { [key: string]: string | undefined };
    pid: number;

    exec(command: string, options: ProcessProviderExecOptions): Promise<{ stdout: string, stderr: string }>;
}

export class ChildProcessProvider implements ProcessProvider {

    get env(): { [key: string]: string | undefined } {
        return process.env;
    }

    get pid(): number {
        return process.pid;
    }

    public async exec(command: string, options: ProcessProviderExecOptions): Promise<{ stdout: string, stderr: string }> {
        return await new Promise<{ stdout: string, stderr: string }>(
            (resolve, reject) => {
                const p = cp.exec(
                    command,
                    options,
                    (error, stdout, stderr) => {
                        if (error) {
                            return reject(error);
                        }

                        resolve({ stdout, stderr });
                    });

                if (options.progress) {
                    const progress = options.progress;

                    p.stderr.on('data', (chunk: Buffer) => progress(chunk.toString(), p));
                    p.stdout.on('data', (chunk: Buffer) => progress(chunk.toString(), p));
                }
            });
    }
}

export default ChildProcessProvider;
