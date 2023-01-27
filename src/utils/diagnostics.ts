/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

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
    } else {
        systemInfoDisposable = outputChannel.onDidChangeLogLevel((logLevel) => {
            if (logLevel > vscode.LogLevel.Off && logLevel <= vscode.LogLevel.Debug) {
                logSystemInfo(outputChannel);
            }
        });
    }
}
