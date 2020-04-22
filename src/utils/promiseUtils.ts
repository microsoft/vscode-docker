/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { UserCancelledError } from 'vscode-azureextensionui';

export async function delay(ms: number, token?: vscode.CancellationToken): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        let cancellationListener: vscode.Disposable;

        const timeout = setTimeout(() => {
            /* eslint-disable-next-line no-unused-expressions */
            cancellationListener?.dispose();
            resolve();
        }, ms);

        if (token) {
            cancellationListener = token.onCancellationRequested(() => {
                cancellationListener.dispose();
                clearTimeout(timeout);
                reject();
            });
        }
    });
}

export async function getCancelPromise(token: vscode.CancellationToken, message?: string): Promise<never> {
    return new Promise((resolve, reject) => {
        const disposable = token.onCancellationRequested(() => {
            disposable.dispose();
            reject(new UserCancelledError(message));
        })
    })
}
