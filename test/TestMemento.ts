/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export class TestMemento implements vscode.Memento {
    private readonly values: { [key: string]: any } = {};

    get<T>(key: string): T;
    get<T>(key: string, defaultValue: T): T;
    get(key: any, defaultValue?: any) {
        return this.values[key] ?? defaultValue;
    }

    update(key: string, value: any): Thenable<void> {
        this.values[key] = value;
        return Promise.resolve();
    }
}
