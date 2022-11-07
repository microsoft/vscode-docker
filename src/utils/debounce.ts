/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

const activeDebounces: { [key: string]: vscode.Disposable } = {};

export function debounce(delay: number, id: string, callback: () => Promise<void>, thisArg?: unknown): void {
    // If there's an existing call queued up, wipe it out (can't simply refresh as the inputs to the callback may be different)
    if (activeDebounces[id]) {
        activeDebounces[id].dispose();
    }

    // Schedule the callback
    const timeout = setTimeout(() => {
        // Clear the callback since we're about to fire it
        activeDebounces[id].dispose();

        // Fire it
        void callback.call(thisArg);
    }, delay);

    // Keep track of the active debounce, with a disposable that
    // cancels the timeout and deletes the item from the activeDebounces map
    activeDebounces[id] = new vscode.Disposable(() => {
        clearTimeout(timeout);
        delete activeDebounces[id];
    });
}
