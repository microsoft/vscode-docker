/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable unicorn/filename-case */

import { Event } from 'vscode';

/**
 * Loosely based on https://github.com/microsoft/node-pty/blob/master/typings/node-pty.d.ts, but downloading that is difficult and actually installing
 * the node-pty package is even more difficult (lots of native code)
 */
export interface nodepty {
    spawn(file: string, args: string[] | string, options: unknown): IPty;
}

/**
 * Loosely based on IPty in https://github.com/microsoft/node-pty/blob/master/typings/node-pty.d.ts
 */
export interface IPty {
    kill(): void,
    resize(columns: number, rows: number): void;
    onData: Event<string>;
    onExit: Event<{ exitCode: number, signal?: number }>;
}
