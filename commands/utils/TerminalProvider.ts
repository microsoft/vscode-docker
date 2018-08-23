/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
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

/**
 * Creates terminals for testing that automatically save the standard and error output of the commands sent to it
 */
export class TestTerminalProvider {
  private _currentTerminal: TestTerminal;

  public createTerminal(name: string): TestTerminal {
    let terminal = new DefaultTerminalProvider().createTerminal(name);
    let testTerminal = new TestTerminal(terminal);
    this._currentTerminal = testTerminal;
    return testTerminal;
  }

  public get currentTerminal(): TestTerminal {
    return this._currentTerminal;
  }
}

class TestTerminal implements vscode.Terminal {
  private static _lastSuffix: number = 1;

  private _outputFilePath: string;
  private _errFilePath: string;
  private _semaphorePath: string;
  private _suffix: number;
  private _disposed: boolean;

  constructor(private _terminal: vscode.Terminal) {
    let root = vscode.workspace.rootPath || os.tmpdir();
    this._suffix = TestTerminal._lastSuffix++;

    this._outputFilePath = path.join(root, `.out${this._suffix}`);
    this._errFilePath = path.join(root, `.err${this._suffix}`);
    this._semaphorePath = path.join(root, `.sem${this._suffix}`);
  }

  /**
   * Causes the terminal to exit after completing the current commands, and returns the
   * redirected standard and error output.
   */
  public async exit(): Promise<{ errorText: string, outputText: string }> {
    this.ensureNotDisposed();
    let results = await this.waitForCompletion();
    this.hide();
    this.dispose();
    return results;
  }

  /**
   * Causes the terminal to wait for completion of the current commands, and returns the
   * redirected standard and error output since the last call.
   */
  public async waitForCompletion(): Promise<{ errorText: string, outputText: string }> {
    return this.waitForCompletionCore();
  }

  private async waitForCompletionCore(options: { ignoreErrors?: boolean } = {}): Promise<{ errorText: string, outputText: string }> {
    this.ensureNotDisposed();
    console.log('Waiting for terminal command completion...');

    // Output text to a semaphore file. This will execute when the terminal is no longer busy.
    this.sendTextRaw(`echo Done > ${this._semaphorePath}`);

    // Wait for the semaphore file
    await this.waitForFileCreation(this._semaphorePath);

    assert(await fse.pathExists(this._outputFilePath), 'The output file from the command was not created. Sometimes this can mean the command to execute was not found.');
    let outputText = bufferToString(await fse.readFile(this._outputFilePath));

    assert(await fse.pathExists(this._errFilePath), 'The error file from the command was not created.');
    let errorText = bufferToString(await fse.readFile(this._errFilePath));

    console.log("OUTPUT:");
    console.log(outputText ? outputText : '(NONE)');
    console.log("END OF OUTPUT");

    if (errorText) {
      if (options.ignoreErrors) {
        // console.log("ERROR OUTPUT (IGNORED):");
        // console.log(errorText.replace(/\r/, "\rIGNORED: "));
        // console.log("END OF ERROR OUTPUT (IGNORED)");
      } else {
        console.log("ERRORS:");
        console.log(errorText.replace(/\r/, "\rERROR: "));
        console.log("END OF ERRORS");
      }
    }

    // Remove files in preparation for next commands, if any
    await fse.remove(this._semaphorePath);
    await fse.remove(this._outputFilePath);
    await fse.remove(this._errFilePath);

    return { outputText: outputText, errorText: errorText };
  }

  /**
   * Executes one or more commands and waits for them to complete. Returns stdout output and
   * throws if there is output to stdout.
   */
  public async execute(commands: string | string[], options: { ignoreErrors?: boolean } = {}): Promise<string> {
    if (typeof commands === 'string') {
      commands = [commands];
    }

    this.show();
    for (let command of commands) {
      this.sendText(command);
    }

    let results = await this.waitForCompletionCore(options);

    if (!options.ignoreErrors) {
      assert.equal(results.errorText, '', `Encountered errors executing in terminal`);
    }

    return results.outputText;
  }

  public get name(): string {
    this.ensureNotDisposed(); return this._terminal.name;
  }

  public get processId(): Thenable<number> {
    this.ensureNotDisposed();
    return this._terminal.processId;
  }

  private async waitForFileCreation(filePath: string): Promise<void> {
    return new Promise<void>((resolve, _reject) => {
      let timer = setInterval(
        () => {
          if (fse.existsSync(filePath)) {
            clearInterval(timer);
            resolve();
          }
        }, 500);
    });
  }

  /**
   * Sends text to the terminal, does not wait for completion
   */
  public sendText(text: string, addNewLine?: boolean): void {
    this.ensureNotDisposed();
    console.log(`Executing in terminal: ${text}`);
    if (addNewLine !== false) {
      // Redirect the output and error output to files (not a perfect solution, but it works)
      text += ` >>${this._outputFilePath} 2>>${this._errFilePath}`;
    }
    this.sendTextRaw(text, addNewLine);
  }

  private sendTextRaw(text: string, addNewLine?: boolean): void {
    this._terminal.sendText(text, addNewLine);
  }

  public show(preserveFocus?: boolean): void {
    this.ensureNotDisposed();
    this._terminal.show(preserveFocus);
  }

  public hide(): void {
    this.ensureNotDisposed();
    this._terminal.hide();
  }

  public dispose(): void {
    this._disposed = true;
    this._terminal.dispose();
  }

  private ensureNotDisposed(): void {
    assert(!this._disposed, 'Terminal has already been disposed.');
  }
}

function bufferToString(buffer: Buffer): string {
  if (buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    // Buffer is in UTF-16 format (happens in some shells)
    return buffer.toString("utf-16le");
  }

  return buffer.toString();
}
