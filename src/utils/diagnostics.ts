/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { execAsync } from './execAsync';
import { isLinux } from './osUtils';

export function isLogLevelEnabled(outputChannel: vscode.LogOutputChannel, logLevel: vscode.LogLevel): boolean {
    return outputChannel && outputChannel.logLevel > 0 && outputChannel.logLevel <= logLevel;
}

export function logEnvironment(outputChannel: vscode.LogOutputChannel, environment: NodeJS.ProcessEnv, title?: string): void {
    if (isLogLevelEnabled(outputChannel, vscode.LogLevel.Debug)) {
        try {
            if (title) {
                outputChannel.debug(title);
            }

            for (const key in environment) {
                outputChannel.debug(`${key}: ${process.env[key]}`);
            }
        } catch {
            // Do not throw for diagnostic logging
        }
    }
}

export function logSystemInfo(outputChannel: vscode.LogOutputChannel): void {
    logEnvironment(outputChannel, process.env, '--- Process Environment ---');

    if (isLogLevelEnabled(outputChannel, vscode.LogLevel.Debug)) {
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
    }
}
