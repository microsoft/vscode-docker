/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as stream from 'stream';
import * as vscode from 'vscode';
import { ext } from '../extensionVariables';
import { CancellationError, CommandLineArgs, spawnStreamAsync, StreamSpawnOptions } from '../runtimes/docker';
import { execAsync } from './execAsync';
import { isLinux } from './osUtils';

export function isLogLevelEnabled(outputChannel: vscode.LogOutputChannel, logLevel: vscode.LogLevel): boolean {
    return outputChannel && outputChannel.logLevel > 0 && outputChannel.logLevel <= logLevel;
}

export function logProcessEnvironment(outputChannel: vscode.LogOutputChannel): void {
    if (isLogLevelEnabled(outputChannel, vscode.LogLevel.Debug)) {
        try {
            outputChannel.debug(`--- Process Environment (${Object.getOwnPropertyNames(process.env).length}) ---`);

            for (const key of Object.keys(process.env)) {
                outputChannel.debug(`${key}: ${process.env[key]}`);
            }
        } catch {
            // Do not throw for diagnostic logging
        }
    }
}

export function logDockerEnvironment(outputChannel: vscode.LogOutputChannel): void {
    if (isLogLevelEnabled(outputChannel, vscode.LogLevel.Debug)) {
        try {
            const settingValue: NodeJS.ProcessEnv = vscode.workspace.getConfiguration('docker').get<NodeJS.ProcessEnv>('environment', {});

            outputChannel.debug(`--- Docker Environment (${Object.getOwnPropertyNames(settingValue).length}) ---`);
            for (const key of Object.keys(settingValue)) {
                outputChannel.debug(`${key}: ${settingValue[key]}`);
            }
        } catch {
            // Do not throw for diagnostic logging
        }
    }
}

let loggedSystemInfo: boolean = false;
let systemInfoDisposable: vscode.Disposable;
export function logSystemInfo(outputChannel: vscode.LogOutputChannel): void {
    if (loggedSystemInfo) {
        return;
    }

    if (isLogLevelEnabled(outputChannel, vscode.LogLevel.Debug)) {
        loggedSystemInfo = true;

        if (systemInfoDisposable) {
            systemInfoDisposable.dispose();
            systemInfoDisposable = null;
        }

        logProcessEnvironment(outputChannel);

        logDockerEnvironment(outputChannel);

        // Linux specific system diagnostic logging
        if (isLinux()) {
            outputChannel.debug('--- System Info ---');
            try {
                execAsync('uname -a').catch(() => {/* Do not throw */ });
            } catch {
                // Do not throw for diagnostic logging
            }

            try {
                execAsync('cat /etc/os-release').catch(() => {/* Do not throw */ });
            } catch {
                // Do not throw for diagnostic logging
            }
        }
    } else {
        systemInfoDisposable = outputChannel.onDidChangeLogLevel((logLevel) => {
            if (logLevel > vscode.LogLevel.Off && logLevel <= vscode.LogLevel.Debug) {
                logSystemInfo(outputChannel);
            }
        });
    }
}

export function logCommandPath(outputChannel: vscode.LogOutputChannel, command: string): void {
    if (isLogLevelEnabled(outputChannel, vscode.LogLevel.Debug)) {
        if (isLinux()) {
            try {
                execAsync(`which ${command}`).catch(() => {/* Do not throw errors */ });
            } catch {
                // Do not throw for diagnostic logging
            }
        }
    }
}

export async function spawnStreamWithDiagnosticsAsync(
    command: string,
    args: CommandLineArgs,
    options: StreamSpawnOptions,
): Promise<void> {
    let stdOutPipe: NodeJS.WritableStream | undefined = options.stdOutPipe;
    if (ext.outputChannel.isDebugLoggingEnabled) {
        const debugStdOutPipe = new stream.PassThrough();
        debugStdOutPipe.on('data', (chunk: Buffer) => {
            try {
                ext.outputChannel.debug(chunk.toString());
            } catch {
                // Do not throw on diagnostic errors
            }
        });

        if (stdOutPipe) {
            debugStdOutPipe.pipe(stdOutPipe);
        }
        stdOutPipe = debugStdOutPipe;
    }

    const stdErrPipe = new stream.PassThrough();
    stdErrPipe.on('data', (chunk: Buffer) => {
        try {
            ext.outputChannel.error(chunk.toString());
        } catch {
            // Do not throw on diagnostic errors
        }
    });

    if (options.stdErrPipe) {
        stdErrPipe.pipe(options.stdErrPipe);
    }

    options = {
        ...options,
        onCommand: (command) => {
            ext.outputChannel.debug(command);
            if (typeof options.onCommand === 'function') {
                options.onCommand(command);
            }
        },
        stdOutPipe,
        stdErrPipe,
    };

    try {
        return spawnStreamAsync(command, args, options);
    } catch (err) {
        if (err instanceof CancellationError || err instanceof vscode.CancellationError) {
            ext.outputChannel.debug(err.message);
        } else if (err instanceof Error) {
            ext.outputChannel.error(err.message);
        } else {
            ext.outputChannel.error(`Unknown error: ${JSON.stringify(err)}`);
        }

        // Rethrow any errors
        throw err;
    }
}
