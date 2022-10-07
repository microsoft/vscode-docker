/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from 'vscode';
import type * as jsonrpc from 'vscode-jsonrpc';
import { DisposableLike } from './DisposableLike';

/**
 * Defined to reflect the fact that the events could be from either `vscode`
 * (in the case of VSCode extensions), or `vscode-jsonrpc` (in the case of ServiceHub
 * workers in VS).
 */
export type EventLike<T> = vscode.Event<T> | jsonrpc.Event<T>;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace EventLike {
    /**
     * An instance of {@link EventLike} that will never fire, but meets the interface
     */
    export const None: EventLike<void> = Object.freeze(() => {
        return DisposableLike.None;
    });
}
