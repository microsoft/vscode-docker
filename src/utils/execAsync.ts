/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as cp from 'child_process';

export async function execAsync(command: string, options?: cp.ExecOptions, progress?: (content: string, process: cp.ChildProcess) => void): Promise<{ stdout: string, stderr: string }> {
    return await new Promise((resolve, reject) => {
        const p = cp.exec(command, options, (error, stdout, stderr) => {
            if (error) {
                return reject(error);
            }

            return resolve({ stdout, stderr });
        });

        if (progress) {
            p.stderr.on('data', (chunk: Buffer) => progress(chunk.toString(), p));
            p.stdout.on('data', (chunk: Buffer) => progress(chunk.toString(), p));
        }
    });
}
