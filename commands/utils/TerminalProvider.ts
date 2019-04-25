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
  private _cwd: vscode.Uri | undefined;

  constructor(extensionExecutionContext: vscode.ExtensionExecutionContext) {
    // When the extension is executing locally but there is a remote present,
    // creating a terminal defaults to the remote. Passing a file URI overrides
    // this behavior so the terminal is created locally.
    this._cwd = extensionExecutionContext === vscode.ExtensionExecutionContext.Remote
      ? undefined
      : process.platform === 'win32'
        ? vscode.Uri.file(process.env.USERPROFILE || 'c:\\')
        : vscode.Uri.file(process.env.HOME || '/');
  }

  public createTerminal(name: string): Terminal {
    const terminalOptions: vscode.TerminalOptions = {
      cwd: this._cwd,
      name
    };

    const value: string = vscode.workspace.getConfiguration("docker").get("host", "");
    if (value) {
      terminalOptions.env = {
        DOCKER_HOST: value
      };
    }

    return vscode.window.createTerminal(terminalOptions);
  }
}
