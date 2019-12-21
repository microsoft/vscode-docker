/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { Terminal } from 'vscode';
import { addDockerSettingsToEnv } from './addDockerSettingsToEnv';

export interface ITerminalProvider {
    createTerminal(name: string): Terminal;
}

export class DefaultTerminalProvider {
    public createTerminal(name: string): Terminal {
        let terminalOptions: vscode.TerminalOptions = {};
        terminalOptions.name = name;
        terminalOptions.env = {};
        addDockerSettingsToEnv(terminalOptions.env, process.env);
        return vscode.window.createTerminal(terminalOptions);
    }
}
