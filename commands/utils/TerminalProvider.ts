/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { Terminal } from 'vscode';

export interface ITerminalProvider {
  createTerminal(name: string): Terminal;
}

export class DefaultTerminalProvider {
  public createTerminal(name: string): Terminal {
    let terminalOptions: vscode.TerminalOptions = {};
    terminalOptions.name = name;
    const value: string = vscode.workspace.getConfiguration("docker").get("host", "");
    if (value) {
      terminalOptions.env = {
        DOCKER_HOST: value
      };
    }
    return vscode.window.createTerminal(terminalOptions);
  }
}
