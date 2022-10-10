/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ShellQuotedString, ShellQuoting } from 'vscode';
import { CommandLineArgs } from '../utils/commandLineBuilder';

export interface IShell {
    quote(args: CommandLineArgs): Array<string>;
    goTemplateQuotedString(arg: string, quoting: ShellQuoting): ShellQuotedString;
    getShellOrDefault(shell?: string | boolean): string | boolean | undefined;
}
