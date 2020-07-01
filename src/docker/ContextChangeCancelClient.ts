/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from 'vscode';
import { IActionContext, UserCancelledError } from 'vscode-azureextensionui';
import { CancellationToken } from 'vscode-languageclient';
import { CancellationPromiseSource, getCancelPromise, TimeoutPromiseSource } from '../utils/promiseUtils';

export abstract class ContextChangeCancelClient implements Disposable {
    protected contextChangeCps: CancellationPromiseSource = new CancellationPromiseSource();

    public dispose(): void {
        this.contextChangeCps.cancel();
        this.contextChangeCps.dispose();
    }

    protected async withTimeoutAndCancellations<T>(context: IActionContext, callPromise: () => Promise<T>, timeout: number, token?: CancellationToken): Promise<T> {
        const tps = new TimeoutPromiseSource(timeout);
        const evt = tps.onTimeout(() => {
            context.errorHandling.suppressReportIssue = true;
        });

        try {
            const promises: Promise<T>[] = [tps.promise, this.contextChangeCps.promise, callPromise()];

            if (token) {
                promises.push(getCancelPromise(token, UserCancelledError));
            }

            return await Promise.race(promises);
        } finally {
            evt.dispose();
            tps.dispose();
        }
    }
}
