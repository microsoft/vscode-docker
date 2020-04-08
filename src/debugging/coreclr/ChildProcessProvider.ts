/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as cp from 'child_process';
import * as process from 'process';
import { execAsync } from '../../utils/spawnAsync';

export type ProcessProviderExecOptions = cp.ExecOptions & { progress?(content: string, process: cp.ChildProcess): void };

export interface ProcessProvider {
    env: { [key: string]: string | undefined };
    pid: number;

    exec(command: string, options: ProcessProviderExecOptions): Promise<{ stdout: string, stderr: string }>;
}

// note: Don't use this as this will be removed/refacotred.
// use execAsync instead.
export class ChildProcessProvider implements ProcessProvider {
    public get env(): { [key: string]: string | undefined } {
        return process.env;
    }

    public get pid(): number {
        return process.pid;
    }

    public async exec(command: string, options: ProcessProviderExecOptions): Promise<{ stdout: string, stderr: string }> {
        return await execAsync(command, options, options && options.progress);
    }
}

export default ChildProcessProvider;
