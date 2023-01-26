/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAzExtOutputChannel } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { isLogLevelEnabled } from './diagnostics';

export class AzExtLogOutputChannelWrapper implements vscode.LogOutputChannel, IAzExtOutputChannel {
    public readonly name: string;
    public readonly extensionPrefix: string;
    public readonly onDidChangeLogLevel: vscode.Event<vscode.LogLevel>;
    private _logOutputChannel: vscode.LogOutputChannel;

    constructor(logOutputChannel: vscode.LogOutputChannel, extensionPrefix: string) {
        this._logOutputChannel = logOutputChannel;
        this.name = this._logOutputChannel.name;
        this.extensionPrefix = extensionPrefix;
        this.onDidChangeLogLevel = this._logOutputChannel.onDidChangeLogLevel;
    }

    public get logLevel() {
        return this._logOutputChannel.logLevel;
    }

    public get isDebugLoggingEnabled(): boolean {
        return isLogLevelEnabled(this, vscode.LogLevel.Debug);
    }

    appendLog(value: string, options?: { resourceName?: string; date?: Date; }): void {
        const enableOutputTimestampsSetting: string = 'enableOutputTimestamps';
        const projectConfiguration: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(this.extensionPrefix);
        const result: boolean | undefined = projectConfiguration.get<boolean>(enableOutputTimestampsSetting);

        if (!result) {
            this.info(value);
        } else {
            options ||= {};
            this.info(`${options.resourceName ? ' '.concat(options.resourceName) : ''}: ${value}`);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    trace(message: string, ...args: any[]): void {
        this._logOutputChannel.trace(message, ...args);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debug(message: string, ...args: any[]): void {
        this._logOutputChannel.debug(message, ...args);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    info(message: string, ...args: any[]): void {
        this._logOutputChannel.info(message, ...args);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warn(message: string, ...args: any[]): void {
        this._logOutputChannel.warn(message, ...args);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error(error: string | Error, ...args: any[]): void {
        this._logOutputChannel.error(error, ...args);
    }

    append(value: string): void {
        this._logOutputChannel.append(value);
    }

    appendLine(value: string): void {
        this._logOutputChannel.appendLine(value);
    }

    replace(value: string): void {
        this._logOutputChannel.replace(value);
    }

    clear(): void {
        this._logOutputChannel.clear();
    }

    show(preserveFocus?: boolean): void;
    show(column?: vscode.ViewColumn, preserveFocus?: boolean): void;
    show(column?: boolean | vscode.ViewColumn, preserveFocus?: boolean): void {
        this._logOutputChannel.show(column as vscode.ViewColumn, preserveFocus);
    }

    hide(): void {
        this._logOutputChannel.hide();
    }

    dispose(): void {
        this._logOutputChannel.dispose();
    }
}
