/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { UserCancelledError } from '@microsoft/vscode-azext-utils';
import { localize } from '../localize';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCancelPromise(token: vscode.CancellationToken, errorConstructor?: new (...a: any[]) => Error, ...args: unknown[]): Promise<never> {
    return new Promise((resolve, reject) => {
        const disposable = token.onCancellationRequested(() => {
            disposable.dispose();

            if (errorConstructor) {
                reject(new errorConstructor(args));
            } else {
                reject(new UserCancelledError());
            }
        });
    });
}

export class CancellationPromiseSource extends vscode.CancellationTokenSource {
    public readonly promise: Promise<never>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public constructor(errorConstructor?: new (...a: any[]) => Error, ...args: unknown[]) {
        super();
        this.promise = getCancelPromise(this.token, errorConstructor, args);
    }
}

export class TimeoutPromiseSource implements vscode.Disposable {
    private timeoutTimer: NodeJS.Timeout | undefined;
    private readonly cps: CancellationPromiseSource;
    private readonly emitter: vscode.EventEmitter<void>;

    public constructor(private readonly timeoutMs: number) {
        this.cps = new CancellationPromiseSource(Error, localize('vscode-docker.utils.promiseUtils.timeout', 'Request timed out.'));
        this.emitter = new vscode.EventEmitter<void>();
    }

    public onTimeout(callback: () => void): vscode.Disposable {
        return this.emitter.event(callback);
    }

    public get promise(): Promise<never> {
        this.timeoutTimer = setTimeout(() => {
            this.emitter.fire();
            this.cps.cancel();
        }, this.timeoutMs);

        return this.cps.promise;
    }

    public dispose(): void {
        if (this.timeoutTimer) {
            clearTimeout(this.timeoutTimer);
        }

        this.cps.dispose();
        this.emitter.dispose();
    }
}
